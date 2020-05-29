/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
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
} from './types';
import { AlertInstance } from '../../../alerting/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  ALERT_CPU_USAGE,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity, AlertParamType } from '../../common/enums';
import { RawAlertInstance } from '../../../alerting/common';
import { parseDuration } from '../../../alerting/common/parse_duration';
import {
  CommonAlertFilter,
  CommonAlertCpuUsageFilter,
  CommonAlertParams,
  CommonAlertParamDetail,
} from '../../common/types';
import { AlertsClient } from '../../../alerting/server';

const RESOLVED = i18n.translate('xpack.monitoring.alerts.cpuUsage.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.cpuUsage.firing', {
  defaultMessage: 'firing',
});

const DEFAULT_THRESHOLD = -1;
const DEFAULT_DURATION = '5m';

interface CpuUsageParams {
  threshold: number;
  duration: string;
}

export class CpuUsageAlert extends BaseAlert {
  public type = ALERT_CPU_USAGE;
  public label = 'CPU Usage';
  protected defaultParams: CpuUsageParams = {
    threshold: DEFAULT_THRESHOLD,
    duration: DEFAULT_DURATION,
  };
  public get paramDetails() {
    if (!this.rawAlert) {
      return {};
    }

    const params = this.rawAlert.params as CpuUsageParams;
    return {
      threshold: {
        withValueLabel: `Notify when CPU is over ${params.threshold}`,
        rawLabel: `Notify when CPU is over`,
        type: AlertParamType.Number,
      } as CommonAlertParamDetail,
      duration: {
        withValueLabel: `Look at the average over ${params.duration}`,
        rawLabel: `Look at the average over`,
        type: AlertParamType.Duration,
      } as CommonAlertParamDetail,
    };
  }

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
      this.config
    );
    // TODO: ignore single spikes? look for consistency?
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
    const state = (alertInstance.state as unknown) as AlertCpuUsageState;
    if (filters && filters.length) {
      for (const _filter of filters) {
        const filter = _filter as CommonAlertCpuUsageFilter;
        if (filter && filter.nodeUuid) {
          if (state.nodeId !== filter.nodeUuid) {
            return false;
          }
        }
      }
    }
    return true;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertCpuUsageState {
    const stat = item.meta as AlertCpuUsageNodeStats;
    return {
      cluster,
      cpuUsage: stat.cpuUsage,
      nodeId: stat.nodeId,
      nodeName: stat.nodeName,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Danger,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
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
            cpuUsage: stat.cpuUsage,
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
        defaultMessage: `Node {nodeName} is reporting cpu usage of {cpuUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: stat.cpuUsage,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.message1', {
            defaultMessage: `#start_linkInvestigate node#end_link`,
          }),
          tokens: [
            {
              startToken: '#start_link',
              endToken: '#end_link',
              type: AlertMessageTokenType.Link,
              url: `elasticsearch/nodes/${stat.nodeId}`,
            } as AlertMessageLinkToken,
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
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const stat = item.meta as AlertCpuUsageNodeStats;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: RESOLVED,
        cpuUsage: stat.cpuUsage,
        nodeName: stat.nodeName,
        clusterName: cluster.clusterName,
      });
    } else {
      const url = `${this.kibanaUrl}/app/monitoring#/alert/${this.type}`;
      instance.scheduleActions('default', {
        state: FIRING,
        cpuUsage: stat.cpuUsage,
        nodeName: stat.nodeName,
        clusterName: cluster.clusterName,
        action: `<a href="${url}">Investigate</a.`,
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate('xpack.monitoring.alerts.cpuUsage.emailSubject', {
            defaultMessage: `CPU usage alert is {state} for {nodeName} in {clusterName}. CPU usage is {cpuUsage}`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
              nodeName: '{{context.nodeName}}',
              cpuUsage: '{{context.cpuUsage}}',
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
            defaultMessage: `CPU usage alert is {state} for {nodeName} in {clusterName}. CPU usage is {cpuUsage}. Want to get other notifiations for this kind of issue? Visit the Stack Monitoring UI in Kibana to find out more.`,
            values: {
              state: '{{context.state}}',
              clusterName: '{{context.clusterName}}',
              nodeName: '{{context.nodeName}}',
              cpuUsage: '{{context.cpuUsage}}',
            },
          }),
        };
    }
    return null;
  }
}
