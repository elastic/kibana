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
  AlertCpuUsageState,
  AlertCpuUsageNodeStats,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  AlertMessageDocLinkToken,
} from './types';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_CPU_USAGE,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity, AlertParamType } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import { parseDuration } from '../../../alerts/common/parse_duration';
import {
  CommonAlertFilter,
  CommonAlertCpuUsageFilter,
  CommonAlertParams,
  CommonAlertParamDetail,
} from '../../common/types';
import { AlertsClient } from '../../../alerts/server';

const RESOLVED = i18n.translate('xpack.monitoring.alerts.cpuUsage.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.cpuUsage.firing', {
  defaultMessage: 'firing',
});

const DEFAULT_THRESHOLD = 90;
const DEFAULT_DURATION = '5m';

interface CpuUsageParams {
  threshold: number;
  duration: string;
}

export class CpuUsageAlert extends BaseAlert {
  public static paramDetails = {
    threshold: {
      label: `Notify when CPU is over`,
      type: AlertParamType.Percentage,
    } as CommonAlertParamDetail,
    duration: {
      label: `Look at the average over`,
      type: AlertParamType.Duration,
    } as CommonAlertParamDetail,
  };

  public type = ALERT_CPU_USAGE;
  public label = 'CPU Usage';

  protected defaultParams: CpuUsageParams = {
    threshold: DEFAULT_THRESHOLD,
    duration: DEFAULT_DURATION,
  };

  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'nodes', description: 'The list of nodes that are reporting high cpu usage.' },
    { name: 'count', description: 'The number of nodes that are reporting high cpu usage.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
    { name: 'action', description: 'The recommended action to take based on this alert firing.' },
  ];

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
    const duration = parseDuration(((params as unknown) as CpuUsageParams).duration);
    const endMs = +new Date();
    const startMs = endMs - duration;
    const stats = await fetchCpuUsageNodeStats(
      callCluster,
      clusters,
      esIndexPattern,
      startMs,
      endMs,
      this.config.ui.max_bucket_size
    );
    return stats.map((stat) => {
      let cpuUsage = 0;
      if (this.config.ui.container.elasticsearch.enabled) {
        cpuUsage =
          (stat.containerUsage / (stat.containerPeriods * stat.containerQuota * 1000)) * 100;
      } else {
        cpuUsage = stat.cpuUsage;
      }

      return {
        instanceKey: `${stat.clusterUuid}:${stat.nodeId}`,
        clusterUuid: stat.clusterUuid,
        shouldFire: cpuUsage > params.threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
        ccs: stat.ccs,
      };
    });
  }

  public async getStates(alertsClient: AlertsClient, id: string, filters: any[]) {
    const states = await super.getStates(alertsClient, id, filters);
    return Object.keys(states).reduce((accum, stateType) => {
      return {
        ...accum,
        [stateType]: {
          ...states[stateType],
          meta: {
            ...states[stateType].meta,
            metrics: ['node_cpu_metric'],
          },
        },
      };
    }, {});
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceState = (alertInstance.state as unknown) as AlertInstanceState;
    if (filters && filters.length) {
      for (const _filter of filters) {
        const filter = _filter as CommonAlertCpuUsageFilter;
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
        {
          text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.hotThreads', {
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
          text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.runningTasks', {
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
    instanceState: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }

    const nodes = instanceState.alertStates
      .map((_state) => {
        const state = _state as AlertCpuUsageState;
        return `${state.nodeName}:${state.cpuUsage.toFixed(2)}`;
      })
      .join(',');

    const ccs = instanceState.alertStates.reduce((accum: string, state): string => {
      if (state.ccs) {
        return state.ccs;
      }
      return accum;
    }, '');

    if (!instanceState.alertStates[0].ui.isFiring) {
      instance.scheduleActions('default', {
        state: RESOLVED,
        nodes,
        count: instanceState.alertStates.length,
        clusterName: cluster.clusterName,
      });
    } else {
      const globalState = [`cluster_uuid:${cluster.clusterUuid}`];
      if (ccs) {
        globalState.push(`ccs:${ccs}`);
      }
      const url = `${this.kibanaUrl}/app/monitoring#elasticsearch/nodes?_g=(${globalState.join(
        ','
      )})`;
      instance.scheduleActions('default', {
        state: FIRING,
        nodes,
        count: instanceState.alertStates.length,
        clusterName: cluster.clusterName,
        action: `[Investigate](${url})`,
      });
    }
  }

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

      const instance = services.alertInstanceFactory(`${this.type}:${cluster.clusterUuid}`);
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

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.cpuUsage.emailSubject', {
            defaultMessage: `CPU usage alert is {state} for {count} node(s) in cluster: {clusterName}`,
            values: {
              state: '{{context.state}}',
              count: '{{context.count}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
          message: i18n.translate('xpack.monitoring.alerts.cpuUsage.emailMessage', {
            defaultMessage: `{action}`,
            values: {
              action: '{{context.action}}',
            },
          }),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate('xpack.monitoring.alerts.cpuUsage.serverLog', {
            defaultMessage: `CPU usage alert is {state} for {count} node(s) in cluster: {clusterName}`,
            values: {
              state: '{{context.state}}',
              count: '{{context.count}}',
              clusterName: '{{context.clusterName}}',
            },
          }),
        };
    }
    return null;
  }
}
