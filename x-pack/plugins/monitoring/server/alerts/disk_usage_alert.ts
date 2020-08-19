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
  AlertMessageDocLinkToken,
} from './types';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import { INDEX_PATTERN_ELASTICSEARCH, ALERT_DISK_USAGE } from '../../common/constants';
import { fetchDiskUsageNodeStats } from '../lib/alerts/fetch_disk_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity, AlertParamType } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import { CommonAlertFilter, CommonAlertParams, CommonAlertParamDetail } from '../../common/types';

import { AlertingDefaults } from './alerts_common';

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

  public static readonly TYPE = ALERT_DISK_USAGE;

  public static readonly LABEL = i18n.translate('xpack.monitoring.alerts.diskUsage.label', {
    defaultMessage: 'Disk Usage',
  });

  public type = DiskUsageAlert.TYPE;
  public paramDetails = DiskUsageAlert.PARAM_DETAILS;
  public label = DiskUsageAlert.LABEL;

  protected defaultParams = {
    threshold: 90,
    duration: '5m',
  };

  protected actionVariables = [...Object.values(AlertingDefaults.ACTION_VARIABLES.context)];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
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
      const diskUsed = 100 - stat.diskAvailable;
      return {
        instanceKey: `${stat.clusterUuid}:${stat.nodeId}`,
        clusterUuid: stat.clusterUuid,
        shouldFire: diskUsed > threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
        ccs: stat.ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceStates = alertInstance.state?.alertStates as AlertDiskUsageState[];
    const nodeUuid = filters.find((filter) => filter.nodeUuid);

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
          diskUsage: stat.diskUsage.toFixed(2),
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.hotThreads', {
            defaultMessage: `#start_linkCheck hot threads#end_link`,
          }),
          tokens: [
            {
              startToken: '#start_link',
              endToken: '#end_link',
              type: AlertMessageTokenType.DocLink,
              partialUrl: `{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html`,
            } as AlertMessageDocLinkToken,
          ],
        },
        {
          text: i18n.translate('xpack.monitoring.alerts.diskUsage.ui.nextSteps.runningTasks', {
            defaultMessage: `#start_linkCheck long running tasks#end_link`,
          }),
          tokens: [
            {
              startToken: '#start_link',
              endToken: '#end_link',
              type: AlertMessageTokenType.DocLink,
              partialUrl: `{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html`,
            } as AlertMessageDocLinkToken,
          ],
        },
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
    if (!alertStates.length) {
      return;
    }

    const ccs = alertStates.reduce((accum: string, state): string => {
      if (state.ccs) {
        return state.ccs;
      }
      return accum;
    }, '');

    const firingCount = alertStates.filter((alertState) => alertState.ui.isFiring).length;

    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.diskUsage.shortAction', {
        defaultMessage: 'Verify disk levels across affected nodes.',
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
        state: AlertingDefaults.ACTION_VARIABLES.state.firing,
        nodes: (alertStates as AlertDiskUsageState[])
          .filter((state: AlertDiskUsageState) => state.ui.isFiring)
          .map((state: AlertDiskUsageState) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`)
          .join(','),
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    } else {
      const resolvedCount = alertStates.filter((alertState) => !alertState.ui.isFiring).length;
      const resolvedNodes = (alertStates as AlertDiskUsageState[])
        .filter((state) => !state.ui.isFiring)
        .map((state) => `${state.nodeName}:${state.diskUsage.toFixed(2)}`)
        .join(',');
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
          state: AlertingDefaults.ACTION_VARIABLES.state.resolved,
          nodes: resolvedNodes,
          count: resolvedCount,
          clusterName: cluster.clusterName,
        });
      }
    }
  }

  // TODO:
  protected processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger
  ) {
    for (const cluster of clusters) {
      const nodes = data.filter((_item) => _item.clusterUuid === cluster.clusterUuid);
      if (nodes.length === 0) {
        continue;
      }

      const firingNodeUuids = nodes.reduce((list: string[], node) => {
        const stat = node.meta as AlertDiskUsageState;
        if (node.shouldFire) {
          list.push(stat.nodeId);
        }
        return list;
      }, [] as string[]);
      firingNodeUuids.sort(); // It doesn't matter how we sort, but keep the order consistent
      const instanceId = `${this.type}:${cluster.clusterUuid}:${firingNodeUuids.join(',')}`;
      const instance = services.alertInstanceFactory(instanceId);
      const state = (instance.getState() as unknown) as AlertInstanceState;
      const alertInstanceState: AlertInstanceState = { alertStates: state?.alertStates || [] };
      let shouldExecuteActions = false;
      for (const node of nodes) {
        const stat = node.meta as AlertDiskUsageState;
        let nodeState: AlertDiskUsageState;
        const indexInState = alertInstanceState.alertStates.findIndex((alertState) => {
          const nodeAlertState = alertState as AlertDiskUsageState;
          return (
            nodeAlertState.cluster.clusterUuid === cluster.clusterUuid &&
            nodeAlertState.nodeId === (node.meta as AlertDiskUsageState).nodeId
          );
        });
        if (indexInState > -1) {
          nodeState = alertInstanceState.alertStates[indexInState] as AlertDiskUsageState;
        } else {
          nodeState = this.getDefaultAlertState(cluster, node) as AlertDiskUsageState;
        }

        nodeState.diskUsage = stat.diskUsage;
        nodeState.nodeId = stat.nodeId;
        nodeState.nodeName = stat.nodeName;

        if (node.shouldFire) {
          nodeState.ui.triggeredMS = new Date().valueOf();
          nodeState.ui.isFiring = true;
          nodeState.ui.message = this.getUiMessage(nodeState, node);
          nodeState.ui.severity = node.severity;
          nodeState.ui.resolvedMS = 0;
          shouldExecuteActions = true;
        } else if (!node.shouldFire && nodeState.ui.isFiring) {
          nodeState.ui.isFiring = false;
          nodeState.ui.resolvedMS = new Date().valueOf();
          nodeState.ui.message = this.getUiMessage(nodeState, node);
          shouldExecuteActions = true;
        }

        if (indexInState === -1) {
          alertInstanceState.alertStates.push(nodeState);
        } else {
          alertInstanceState.alertStates = [
            ...alertInstanceState.alertStates.slice(0, indexInState),
            nodeState,
            ...alertInstanceState.alertStates.slice(indexInState + 1),
          ];
        }
      }

      instance.replaceState(alertInstanceState);
      if (shouldExecuteActions) {
        this.executeActions(instance, alertInstanceState, null, cluster);
      }
    }
  }
}
