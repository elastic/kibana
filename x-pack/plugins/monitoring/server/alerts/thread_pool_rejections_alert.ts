/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient, Logger } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertThreadPoolRejectionsState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
} from './types';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import { INDEX_PATTERN_ELASTICSEARCH, ALERT_THREAD_POOL_REJECTIONS } from '../../common/constants';
import { fetchThreadPoolRejectionStats } from '../lib/alerts/fetch_thread_pool_rejections_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import {
  CommonAlertFilter,
  ThreadPoolRejectionsAlertParams,
  CommonAlertParamDetail,
} from '../../common/types';
import { AlertingDefaults, createLink } from './alerts_common';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';

type ThreadPoolType = 'SEARCH' | 'WRITE' | string;

interface MessageOptions {
  count?: number;
  type?: ThreadPoolType;
  nodeName?: string;
  nodeId: string;
}

interface RejectionsShouldFire {
  shouldFireSearchRejections?: boolean;
  shouldFireWriteRejections?: boolean;
}

type ThreadPoolAlertData = Omit<AlertData, 'shouldFire'> & RejectionsShouldFire;

interface ThreadpoolParamDetails {
  search: CommonAlertParamDetail;
  write: CommonAlertParamDetail;
  [key: string]: CommonAlertParamDetail;
}

export class ThreadPoolRejectionsAlert extends BaseAlert {
  public static readonly PARAM_DETAILS: ThreadpoolParamDetails = {
    search: {
      label: i18n.translate(
        'xpack.monitoring.alerts.searchRejection.paramDetails.threshold.label',
        {
          defaultMessage: `SEARCH rejection`,
        }
      ),
    },
    write: {
      label: i18n.translate('xpack.monitoring.alerts.writeRejection.paramDetails.threshold.label', {
        defaultMessage: `WRITE rejection`,
      }),
    },
  };
  public static paramDetails = ThreadPoolRejectionsAlert.PARAM_DETAILS;
  public static readonly TYPE = ALERT_THREAD_POOL_REJECTIONS;
  public static readonly LABEL = i18n.translate(
    'xpack.monitoring.alerts.threadPoolRejections.label',
    {
      defaultMessage: 'Thread Pool Rejections',
    }
  );

  private readonly THREAD_POOL_TYPE = {
    search: 'SEARCH',
    write: 'WRITE',
  };

  public type = ThreadPoolRejectionsAlert.TYPE;
  public label = ThreadPoolRejectionsAlert.LABEL;

  protected defaultParams: ThreadPoolRejectionsAlertParams = {
    search: {
      threshold: 0,
      enabled: true,
    },
    write: {
      threshold: 0,
      enabled: true,
    },
  };

  protected actionVariables = [
    {
      name: 'count',
      description: i18n.translate(
        'xpack.monitoring.alerts.threadPoolRejections.actionVariables.count',
        {
          defaultMessage: 'The number of nodes reporting high thread pool rejections.',
        }
      ),
    },
    {
      name: 'threadPoolType',
      description: i18n.translate(
        'xpack.monitoring.alerts.threadPoolRejections.actionVariables.threadPoolType',
        {
          defaultMessage: 'Rejected thread pool type eg: SEARCH, WRITE, and etc.',
        }
      ),
    },
    ...Object.values(AlertingDefaults.ALERT_TYPE.context),
  ];

  protected async fetchData(
    params: ThreadPoolRejectionsAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<ThreadPoolAlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }

    const { search, write } = params;
    const { threshold: searchRejectionsThreshold, enabled: searchRejectionsEnabled } = search;
    const { threshold: writeRejectionsThreshold, enabled: writeRejectionsEnabled } = write;
    const checkSearchRejections = searchRejectionsEnabled && searchRejectionsThreshold > 0;
    const checkWriteRejections = writeRejectionsEnabled && writeRejectionsThreshold > 0;

    const stats = await fetchThreadPoolRejectionStats(
      callCluster,
      clusters,
      esIndexPattern,
      this.config.ui.max_bucket_size,
      checkSearchRejections,
      checkWriteRejections
    );

    return stats.map((stat) => {
      const { clusterUuid, nodeId, searchRejections, writeRejections, ccs } = stat;
      const shouldFireSearchRejections =
        checkSearchRejections && searchRejections! >= searchRejectionsThreshold;
      const shouldFireWriteRejections =
        checkWriteRejections && writeRejections! >= writeRejectionsThreshold;
      return {
        instanceKey: `${clusterUuid}:${nodeId}`,
        shouldFireSearchRejections,
        shouldFireWriteRejections,
        searchRejections,
        writeRejections,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceStates = alertInstance.state
      ?.alertStates as AlertThreadPoolRejectionsState[];
    const nodeUuid = filters?.find((filter) => filter.nodeUuid)?.nodeUuid;

    if (!alertInstanceStates?.length || !nodeUuid) {
      return true;
    }

    const nodeAlerts = alertInstanceStates.filter(({ nodeId }) => nodeId === nodeUuid);
    return Boolean(nodeAlerts.length);
  }

  protected getUiMessage(alertState: AlertState, options: MessageOptions): AlertMessage {
    const { nodeName, nodeId, type, count } = options;
    return {
      text: i18n.translate('xpack.monitoring.alerts.threadPoolRejections.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting {count} {type} rejections at #absolute`,
        values: {
          nodeName,
          type,
          count,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.tuneThreadPools',
            {
              defaultMessage: '#start_linkTune thread pools#end_link',
            }
          ),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/modules-threadpool.html`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.identifyIndicesShards',
            {
              defaultMessage: '#start_linkIdentify large indices/shards#end_link',
            }
          ),
          'elasticsearch/indices',
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.addMoreNodes', {
            defaultMessage: '#start_linkAdd more nodes#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.resizeYourDeployment',
            {
              defaultMessage: '#start_linkResize your deployment (ECE)#end_link',
            }
          ),
          `{elasticWebsiteUrl}guide/en/cloud-enterprise/current/ece-resize-deployment.html`
        ),
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: `elasticsearch/nodes/${nodeId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    alertStates: any[],
    type: ThreadPoolType,
    cluster: AlertCluster
  ) {
    const count = alertStates.length;
    const { clusterName: clusterKnownName, clusterUuid } = cluster;
    const clusterName = clusterKnownName || clusterUuid;
    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.shortAction',
      {
        defaultMessage: 'Verify {type} thread pool rejections across affected nodes.',
        values: {
          type,
        },
      }
    );

    const fullActionText = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.fullAction',
      {
        defaultMessage: 'View nodes',
      }
    );

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink('elasticsearch/nodes', clusterUuid, ccs);

    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.firing.internalShortMessage',
      {
        defaultMessage: `Thread pool rejections alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
        values: {
          count,
          clusterName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.firing.internalFullMessage',
      {
        defaultMessage: `Thread pool rejections alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
        values: {
          count,
          clusterName,
          action,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: this.isCloud ? internalShortMessage : internalFullMessage,
      threadPoolType: type,
      state: AlertingDefaults.ALERT_STATE.firing,
      count,
      clusterName,
      action,
      actionPlain: shortActionText,
    });
  }

  private createNewNodeState(
    nodeState: AlertThreadPoolRejectionsState,
    type: ThreadPoolType,
    count?: number
  ) {
    const newNodeState: AlertThreadPoolRejectionsState = { ...nodeState, type, count };
    const { nodeId, nodeName } = nodeState;
    const messageOptions: MessageOptions = {
      nodeId,
      nodeName,
      type,
      count,
    };
    const message = this.getUiMessage(nodeState, messageOptions);
    newNodeState.ui = { ...nodeState.ui, message };
    return newNodeState;
  }

  protected async processData(
    data: ThreadPoolAlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger,
    state: { lastChecked?: number }
  ) {
    const currentUTC = +new Date();
    for (const cluster of clusters) {
      const nodes = data.filter((node) => node.clusterUuid === cluster.clusterUuid);
      if (!nodes.length) {
        continue;
      }

      const firingSearchRejectionsNodeUuids = nodes.filter(
        (node) => node.shouldFireSearchRejections
      );
      const firingWriteRejectionsNodeUuids = nodes.filter((node) => node.shouldFireWriteRejections);

      if (!firingSearchRejectionsNodeUuids.length && !firingWriteRejectionsNodeUuids.length) {
        continue;
      }

      const searchRejectionsInstanceSuffix = firingSearchRejectionsNodeUuids.map(
        (node) => node.meta.nodeId
      );
      const writeRejectionsInstanceSuffix = firingWriteRejectionsNodeUuids.map(
        (node) => node.meta.nodeId
      );
      const instancePrefix = `${this.type}:${cluster.clusterUuid}:`;

      const searchRejectionsInstanceId = `${instancePrefix}:search:${searchRejectionsInstanceSuffix}`;
      const writeRejectionsInstanceId = `${instancePrefix}:write:${writeRejectionsInstanceSuffix}`;

      const searchRejectionsInstance = services.alertInstanceFactory(searchRejectionsInstanceId);
      const writeRejectionsInstance = services.alertInstanceFactory(writeRejectionsInstanceId);

      const newSearchRejectionsAlertStates: AlertThreadPoolRejectionsState[] = [];
      const newWriteRejectionsAlertStates: AlertThreadPoolRejectionsState[] = [];

      for (const node of nodes) {
        const stat = node.meta as AlertThreadPoolRejectionsState & {
          searchRejections?: number;
          writeRejections?: number;
        };
        const nodeState = this.getDefaultAlertState(
          cluster,
          node
        ) as AlertThreadPoolRejectionsState;
        const { nodeId, nodeName, searchRejections, writeRejections } = stat;
        nodeState.nodeId = nodeId;
        nodeState.nodeName = nodeName;
        nodeState.ui.triggeredMS = currentUTC;
        nodeState.ui.isFiring = true;
        nodeState.ui.severity = node.severity;

        if (node.shouldFireSearchRejections) {
          const newNodeState = this.createNewNodeState(
            nodeState,
            this.THREAD_POOL_TYPE.search,
            searchRejections
          );
          newSearchRejectionsAlertStates.push(newNodeState);
        }

        if (node.shouldFireWriteRejections) {
          const newNodeState = this.createNewNodeState(
            nodeState,
            this.THREAD_POOL_TYPE.write,
            writeRejections
          );
          newWriteRejectionsAlertStates.push(newNodeState);
        }
      }

      const alertSearchRejectionsInstanceState = { alertStates: newSearchRejectionsAlertStates };
      searchRejectionsInstance.replaceState(alertSearchRejectionsInstanceState);
      if (newSearchRejectionsAlertStates.length) {
        this.executeActions(
          searchRejectionsInstance,
          newSearchRejectionsAlertStates,
          this.THREAD_POOL_TYPE.search,
          cluster
        );
      }

      const alertWriteRejectionsInstanceState = { alertStates: newWriteRejectionsAlertStates };
      writeRejectionsInstance.replaceState(alertWriteRejectionsInstanceState);
      if (newWriteRejectionsAlertStates.length) {
        this.executeActions(
          writeRejectionsInstance,
          newWriteRejectionsAlertStates,
          this.THREAD_POOL_TYPE.write,
          cluster
        );
      }
    }

    state.lastChecked = currentUTC;
    return state;
  }
}
