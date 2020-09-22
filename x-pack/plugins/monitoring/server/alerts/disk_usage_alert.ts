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
  AlertDiskUsageState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
} from './types';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import { INDEX_PATTERN_ELASTICSEARCH, ALERT_DISK_USAGE } from '../../common/constants';
import { fetchDiskUsageNodeStats } from '../lib/alerts/fetch_disk_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity, AlertParamType } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import { CommonAlertFilter, CommonAlertParams, CommonAlertParamDetail } from '../../common/types';
import { AlertingDefaults, createLink } from './alerts_common';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';

interface ParamDetails {
  [key: string]: CommonAlertParamDetail;
}

export class DiskUsageAlert extends BaseAlert {
  public static readonly PARAM_DETAILS: ParamDetails = {
    threshold: {
      label: i18n.translate('xpack.monitoring.alerts.diskUsage.paramDetails.threshold.label', {
        defaultMessage: `Notify when disk capacity is over`,
      }),
      type: AlertParamType.Percentage,
    },
    duration: {
      label: i18n.translate('xpack.monitoring.alerts.diskUsage.paramDetails.duration.label', {
        defaultMessage: `Look at the average over`,
      }),
      type: AlertParamType.Duration,
    },
  };
  public static paramDetails = DiskUsageAlert.PARAM_DETAILS;
  public static readonly TYPE = ALERT_DISK_USAGE;
  public static readonly LABEL = i18n.translate('xpack.monitoring.alerts.diskUsage.label', {
    defaultMessage: 'Disk Usage',
  });
  public type = DiskUsageAlert.TYPE;
  public label = DiskUsageAlert.LABEL;

  protected defaultParams = {
    threshold: 90,
    duration: '5m',
  };

  protected actionVariables = [
    {
      name: 'nodes',
      description: i18n.translate('xpack.monitoring.alerts.diskUsage.actionVariables.nodes', {
        defaultMessage: 'The list of nodes reporting high disk usage.',
      }),
    },
    {
      name: 'count',
      description: i18n.translate('xpack.monitoring.alerts.diskUsage.actionVariables.count', {
        defaultMessage: 'The number of nodes reporting high disk usage.',
      }),
    },
    ...Object.values(AlertingDefaults.ALERT_TYPE.context),
  ];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const { duration, threshold } = params;
    const stats = await fetchDiskUsageNodeStats(
      callCluster,
      clusters,
      esIndexPattern,
      duration as string,
      this.config.ui.max_bucket_size
    );

    return stats.map((stat) => {
      const { clusterUuid, nodeId, diskUsage, ccs } = stat;
      return {
        instanceKey: `${clusterUuid}:${nodeId}`,
        shouldFire: diskUsage > threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceStates = alertInstance.state?.alertStates as AlertDiskUsageState[];
    const nodeUuid = filters?.find((filter) => filter.nodeUuid);

    if (!filters || !filters.length || !alertInstanceStates?.length || !nodeUuid) {
      return true;
    }

    const nodeAlerts = alertInstanceStates.filter(({ nodeId }) => nodeId === nodeUuid);
    return Boolean(nodeAlerts.length);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const currentState = super.getDefaultAlertState(cluster, item);
    currentState.ui.severity = AlertSeverity.Warning;
    return currentState;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertDiskUsageState;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.resolvedMessage', {
          defaultMessage: `The disk usage on node {nodeName} is now under the threshold, currently reporting at {diskUsage}% as of #resolved`,
          values: {
            nodeName: stat.nodeName,
            diskUsage: stat.diskUsage.toFixed(2),
          },
        }),
        tokens: [
          {
            startToken: '#resolved',
            type: AlertMessageTokenType.Time,
            isAbsolute: true,
            isRelative: false,
            timestamp: alertState.ui.resolvedMS,
          } as AlertMessageTimeToken,
        ],
      };
    }
    return {
      text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting disk usage of {diskUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          diskUsage: stat.diskUsage,
        },
      }),
      nextSteps: [
        createLink(
          'xpack.monitoring.alerts.diskUsage.ui.nextSteps.tuneDisk',
          'Tune for disk usage',
          `{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/tune-for-disk-usage.html`
        ),
        createLink(
          'xpack.monitoring.alerts.diskUsage.ui.nextSteps.tuneDisk',
          'Identify large indices',
          `elasticsearch/indices`,
          AlertMessageTokenType.Link
        ),
        createLink(
          'xpack.monitoring.alerts.diskUsage.ui.nextSteps.ilmPolicies',
          'Implement ILM policies',
          `{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/index-lifecycle-management.html`
        ),
        createLink(
          'xpack.monitoring.alerts.diskUsage.ui.nextSteps.addMoreNodes',
          'Add more data nodes',
          `{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          'xpack.monitoring.alerts.diskUsage.ui.nextSteps.resizeYourDeployment',
          'Resize your deployment (ECE)',
          `{elasticWebsiteUrl}/guide/en/cloud-enterprise/{docLinkVersion}/ece-resize-deployment.html`
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
          url: `elasticsearch/nodes/${stat.nodeId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const firingNodes = alertStates.filter(
      (alertState) => alertState.ui.isFiring
    ) as AlertDiskUsageState[];
    const firingCount = firingNodes.length;

    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.shortAction', {
        defaultMessage: 'Verify disk usage levels across affected nodes.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.fullAction', {
        defaultMessage: 'View nodes',
      });
      const globalState = [`cluster_uuid:${cluster.clusterUuid}`];
      if (ccs) {
        globalState.push(`ccs:${ccs}`);
      }
      const url = `${this.kibanaUrl}/app/monitoring#elasticsearch/nodes?_g=(${globalState.join(
        ','
      )})`;
      const action = `[${fullActionText}](${url})`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.diskUsage.firing.internalShortMessage',
        {
          defaultMessage: `Disk usage alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.diskUsage.firing.internalFullMessage',
        {
          defaultMessage: `Disk usage alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );

      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: this.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        nodes: firingNodes
          .map((state) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`)
          .join(','),
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    } else {
      const resolvedNodes = (alertStates as AlertDiskUsageState[])
        .filter((state) => !state.ui.isFiring)
        .map((state) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`);
      const resolvedCount = resolvedNodes.length;

      if (resolvedCount > 0) {
        const internalMessage = i18n.translate(
          'xpack.monitoring.alerts.diskUsage.resolved.internalMessage',
          {
            defaultMessage: `Disk usage alert is resolved for {count} node(s) in cluster: {clusterName}.`,
            values: {
              count: resolvedCount,
              clusterName: cluster.clusterName,
            },
          }
        );

        instance.scheduleActions('default', {
          internalShortMessage: internalMessage,
          internalFullMessage: internalMessage,
          state: AlertingDefaults.ALERT_STATE.resolved,
          nodes: resolvedNodes.join(','),
          count: resolvedCount,
          clusterName: cluster.clusterName,
        });
      }
    }
  }

  private executeDeltas(
    services: AlertServices,
    cluster: AlertCluster,
    newAlertStates: AlertDiskUsageState[],
    oldAlertStates: AlertDiskUsageState[]
  ) {
    const deltaFiringStates = [];
    const deltaResolvedStates = [];
    const deltaInstanceIdPrefix: string = `.monitoring:${this.type}:${
      cluster.clusterUuid
    }:${Date.now()}:`;

    for (const newAlertState of newAlertStates) {
      const relatedOldState = oldAlertStates.find(
        (oldState) =>
          oldState.nodeId === newAlertState.nodeId &&
          oldState.ui.isFiring !== newAlertState.ui.isFiring &&
          oldState.ui.resolvedMS !== newAlertState.ui.resolvedMS
      );
      if (!relatedOldState) {
        if (newAlertState.ui.isFiring) {
          deltaFiringStates.push(newAlertState);
        } else if (newAlertState.ui.resolvedMS) {
          deltaResolvedStates.push(newAlertState);
        }
      }
    }

    if (deltaFiringStates.length + deltaResolvedStates.length === newAlertStates.length) {
      /** No delta changes, so we do nothing */
      return;
    }

    if (deltaFiringStates.length) {
      const instance = services.alertInstanceFactory(`${deltaInstanceIdPrefix}:firing`);
      this.executeActions(instance, { alertStates: deltaFiringStates }, null, cluster);
    }

    if (deltaResolvedStates.length) {
      const instance = services.alertInstanceFactory(`${deltaInstanceIdPrefix}:resolved`);
      this.executeActions(instance, { alertStates: deltaResolvedStates }, null, cluster);
    }
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger,
    state: any
  ) {
    const currentUTC = Date.now();
    for (const cluster of clusters) {
      const nodes = data.filter((node) => node.clusterUuid === cluster.clusterUuid);
      if (!nodes.length) {
        continue;
      }

      const instanceId = `.monitoring:${this.type}:${cluster.clusterUuid}`;
      const instance = services.alertInstanceFactory(instanceId);
      const instanceState = instance.getState() as AlertInstanceState;
      const newAlertStates: AlertDiskUsageState[] = [];
      const oldAlertStates = (instanceState?.alertStates || []) as AlertDiskUsageState[];

      for (const node of nodes) {
        const stat = node.meta as AlertDiskUsageState;
        const nodeState = this.getDefaultAlertState(cluster, node) as AlertDiskUsageState;
        nodeState.diskUsage = stat.diskUsage;
        nodeState.nodeId = stat.nodeId;
        nodeState.nodeName = stat.nodeName;

        if (node.shouldFire) {
          nodeState.ui.triggeredMS = currentUTC;
          nodeState.ui.isFiring = true;
          nodeState.ui.severity = node.severity;
          newAlertStates.push(nodeState);
        } else {
          const lastNodeState = oldAlertStates.find(
            (oldNodeState) => nodeState.nodeId === oldNodeState.nodeId
          );
          if (lastNodeState?.ui.isFiring) {
            nodeState.ui.resolvedMS = currentUTC;
            newAlertStates.push(nodeState);
          }
        }

        nodeState.ui.message = this.getUiMessage(nodeState, node);
      }

      /**
       * Addresses lost delta triggers if executed between throttle states, context:
       * https://github.com/elastic/kibana/pull/75419#discussion_r490497639. This is
       * a temporary solution until: https://github.com/elastic/kibana/issues/49405 is implemented
       */
      this.executeDeltas(services, cluster, newAlertStates, oldAlertStates);

      const alertInstanceState = { alertStates: newAlertStates };
      instance.replaceState(alertInstanceState);
      if (newAlertStates.length && !instance.hasScheduledActions()) {
        this.executeActions(instance, alertInstanceState, null, cluster);
        state.lastExecutedAction = currentUTC;
      }
    }

    state.lastChecked = currentUTC;
    return state;
  }
}
