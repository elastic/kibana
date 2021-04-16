/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertMessage,
  AlertThreadPoolRejectionsState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  ThreadPoolRejectionsAlertParams,
  CommonAlertFilter,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerting/server';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import { fetchThreadPoolRejectionStats } from '../lib/alerts/fetch_thread_pool_rejections_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { Alert, RawAlertInstance } from '../../../alerting/common';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { Globals } from '../static_globals';

type ActionVariables = Array<{ name: string; description: string }>;

export class ThreadPoolRejectionsAlertBase extends BaseAlert {
  protected static createActionVariables(type: string) {
    return [
      {
        name: 'count',
        description: i18n.translate(
          'xpack.monitoring.alerts.threadPoolRejections.actionVariables.count',
          {
            defaultMessage: 'The number of nodes reporting high thread pool {type} rejections.',
            values: { type },
          }
        ),
      },
      ...Object.values(AlertingDefaults.ALERT_TYPE.context),
    ];
  }

  constructor(
    rawAlert: Alert | undefined = undefined,
    public readonly id: string,
    public readonly threadPoolType: string,
    public readonly name: string,
    public readonly actionVariables: ActionVariables
  ) {
    super(rawAlert, {
      id,
      name,
      defaultParams: {
        threshold: 300,
        duration: '5m',
      },
      actionVariables,
    });
  }

  protected async fetchData(
    params: ThreadPoolRejectionsAlertParams,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }

    const { threshold, duration } = params;

    const stats = await fetchThreadPoolRejectionStats(
      esClient,
      clusters,
      esIndexPattern,
      Globals.app.config.ui.max_bucket_size,
      this.threadPoolType,
      duration
    );

    return stats.map((stat) => {
      const { clusterUuid, rejectionCount, ccs } = stat;

      return {
        shouldFire: rejectionCount > threshold,
        rejectionCount,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getUiMessage(alertState: AlertThreadPoolRejectionsState): AlertMessage {
    const { nodeName, nodeId, rejectionCount } = alertState;
    return {
      text: i18n.translate('xpack.monitoring.alerts.threadPoolRejections.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting {rejectionCount} {type} rejections at #absolute`,
        values: {
          nodeName,
          type: this.threadPoolType,
          rejectionCount,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.monitorThisNode',
            {
              defaultMessage: `#start_linkMonitor this node#end_link`,
            }
          ),
          `elasticsearch/nodes/${nodeId}/advanced`,
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.optimizeQueries',
            {
              defaultMessage: '#start_linkOptimize complex queries#end_link',
            }
          ),
          `{elasticWebsiteUrl}blog/advanced-tuning-finding-and-fixing-slow-elasticsearch-queries`
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
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.threadPoolSettings',
            {
              defaultMessage: '#start_linkThread pool settings#end_link',
            }
          ),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/modules-threadpool.html`
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
    alertStates: AlertThreadPoolRejectionsState[],
    cluster: AlertCluster
  ) {
    const type = this.threadPoolType;
    const count = alertStates.length;
    const { clusterName: clusterKnownName, clusterUuid } = cluster;
    const clusterName = clusterKnownName || clusterUuid;
    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.shortAction',
      {
        defaultMessage: 'Verify thread pool {type} rejections across affected nodes.',
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
        defaultMessage: `Thread pool {type} rejections alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
        values: {
          count,
          clusterName,
          shortActionText,
          type,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.firing.internalFullMessage',
      {
        defaultMessage: `Thread pool {type} rejections alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
        values: {
          count,
          clusterName,
          action,
          type,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      threadPoolType: type,
      state: AlertingDefaults.ALERT_STATE.firing,
      count,
      clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
