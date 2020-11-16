/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertCpuUsageState,
  AlertCpuUsageNodeStats,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertFilter,
  CommonAlertNodeUuidFilter,
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_CPU_USAGE,
  ALERT_DETAILS,
} from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { AlertingDefaults, createLink } from './alert_helpers';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { Globals } from '../static_globals';

interface CpuUsageParams {
  threshold: number;
  duration: string;
}

export class CpuUsageAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_CPU_USAGE,
      name: ALERT_DETAILS[ALERT_CPU_USAGE].label,
      defaultParams: {
        threshold: 85,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'nodes',
          description: i18n.translate('xpack.monitoring.alerts.cpuUsage.actionVariables.nodes', {
            defaultMessage: 'The list of nodes reporting high cpu usage.',
          }),
        },
        {
          name: 'count',
          description: i18n.translate('xpack.monitoring.alerts.cpuUsage.actionVariables.count', {
            defaultMessage: 'The number of nodes reporting high cpu usage.',
          }),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN_ELASTICSEARCH);
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const duration = parseDuration(((params as unknown) as CpuUsageParams).duration);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchCpuUsageNodeStats(
      callCluster,
      clusters,
      esIndexPattern,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size
    );
    return stats.map((stat) => {
      if (Globals.app.config.ui.container.elasticsearch.enabled) {
        stat.cpuUsage =
          (stat.containerUsage / (stat.containerPeriods * stat.containerQuota * 1000)) * 100;
      }

      return {
        instanceKey: `${stat.clusterUuid}:${stat.nodeId}`,
        clusterUuid: stat.clusterUuid,
        shouldFire: stat.cpuUsage > params.threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
        ccs: stat.ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceState = (alertInstance.state as unknown) as AlertInstanceState;
    if (filters && filters.length) {
      for (const _filter of filters) {
        const filter = _filter as CommonAlertNodeUuidFilter;
        if (filter && filter.nodeUuid) {
          let nodeExistsInStates = false;
          for (const state of alertInstanceState.alertStates) {
            if ((state as AlertCpuUsageState).nodeId === filter.nodeUuid) {
              nodeExistsInStates = true;
              break;
            }
          }
          if (!nodeExistsInStates) {
            return false;
          }
        }
      }
    }
    return true;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const base = super.getDefaultAlertState(cluster, item);
    return {
      ...base,
      ui: {
        ...base.ui,
        severity: AlertSeverity.Danger,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertCpuUsageNodeStats;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.resolvedMessage', {
          defaultMessage: `The cpu usage on node {nodeName} is now under the threshold, currently reporting at {cpuUsage}% as of #resolved`,
          values: {
            nodeName: stat.nodeName,
            cpuUsage: stat.cpuUsage.toFixed(2),
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
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting cpu usage of {cpuUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: stat.cpuUsage.toFixed(2),
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.hotThreads', {
            defaultMessage: '#start_linkCheck hot threads#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.runningTasks', {
            defaultMessage: '#start_linkCheck long running tasks#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html`
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
    instanceState: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }

    const firingCount = instanceState.alertStates.filter((alertState) => alertState.ui.isFiring)
      .length;
    const firingNodes = instanceState.alertStates
      .filter((_state) => (_state as AlertCpuUsageState).ui.isFiring)
      .map((_state) => {
        const state = _state as AlertCpuUsageState;
        return `${state.nodeName}:${state.cpuUsage.toFixed(2)}`;
      })
      .join(',');
    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.cpuUsage.shortAction', {
        defaultMessage: 'Verify CPU levels across affected nodes.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.cpuUsage.fullAction', {
        defaultMessage: 'View nodes',
      });
      const action = `[${fullActionText}](elasticsearch/nodes)`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.cpuUsage.firing.internalShortMessage',
        {
          defaultMessage: `CPU usage alert is firing for {count} node(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.cpuUsage.firing.internalFullMessage',
        {
          defaultMessage: `CPU usage alert is firing for {count} node(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );
      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        nodes: firingNodes,
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    } else {
      const resolvedCount = instanceState.alertStates.filter(
        (alertState) => !alertState.ui.isFiring
      ).length;
      const resolvedNodes = instanceState.alertStates
        .filter((_state) => !(_state as AlertCpuUsageState).ui.isFiring)
        .map((_state) => {
          const state = _state as AlertCpuUsageState;
          return `${state.nodeName}:${state.cpuUsage.toFixed(2)}`;
        })
        .join(',');
      if (resolvedCount > 0) {
        instance.scheduleActions('default', {
          internalShortMessage: i18n.translate(
            'xpack.monitoring.alerts.cpuUsage.resolved.internalShortMessage',
            {
              defaultMessage: `CPU usage alert is resolved for {count} node(s) in cluster: {clusterName}.`,
              values: {
                count: resolvedCount,
                clusterName: cluster.clusterName,
              },
            }
          ),
          internalFullMessage: i18n.translate(
            'xpack.monitoring.alerts.cpuUsage.resolved.internalFullMessage',
            {
              defaultMessage: `CPU usage alert is resolved for {count} node(s) in cluster: {clusterName}.`,
              values: {
                count: resolvedCount,
                clusterName: cluster.clusterName,
              },
            }
          ),
          state: AlertingDefaults.ALERT_STATE.resolved,
          nodes: resolvedNodes,
          count: resolvedCount,
          clusterName: cluster.clusterName,
        });
      }
    }
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices
  ) {
    for (const cluster of clusters) {
      const nodes = data.filter((_item) => _item.clusterUuid === cluster.clusterUuid);
      if (nodes.length === 0) {
        continue;
      }
      const firingNodeUuids = nodes.reduce((list: string[], node) => {
        const stat = node.meta as AlertCpuUsageNodeStats;
        if (node.shouldFire) {
          list.push(stat.nodeId);
        }
        return list;
      }, [] as string[]);
      firingNodeUuids.sort(); // It doesn't matter how we sort, but keep the order consistent
      const instanceId = `${this.alertOptions.id}:${cluster.clusterUuid}:${firingNodeUuids.join(
        ','
      )}`;
      const instance = services.alertInstanceFactory(instanceId);
      const state = (instance.getState() as unknown) as AlertInstanceState;
      const alertInstanceState: AlertInstanceState = { alertStates: state?.alertStates || [] };
      let shouldExecuteActions = false;
      for (const node of nodes) {
        const stat = node.meta as AlertCpuUsageNodeStats;
        let nodeState: AlertCpuUsageState;
        const indexInState = alertInstanceState.alertStates.findIndex((alertState) => {
          const nodeAlertState = alertState as AlertCpuUsageState;
          return (
            nodeAlertState.cluster.clusterUuid === cluster.clusterUuid &&
            nodeAlertState.nodeId === (node.meta as AlertCpuUsageNodeStats).nodeId
          );
        });
        if (indexInState > -1) {
          nodeState = alertInstanceState.alertStates[indexInState] as AlertCpuUsageState;
        } else {
          nodeState = this.getDefaultAlertState(cluster, node) as AlertCpuUsageState;
        }
        nodeState.cpuUsage = stat.cpuUsage;
        nodeState.nodeId = stat.nodeId;
        nodeState.nodeName = stat.nodeName;

        if (node.shouldFire) {
          if (!nodeState.ui.isFiring) {
            nodeState.ui.triggeredMS = new Date().valueOf();
          }
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
