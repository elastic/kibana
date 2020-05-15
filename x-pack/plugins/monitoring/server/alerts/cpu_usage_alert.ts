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
  ALERT_CPU_USAGE_THRESHOLD_CONFIG,
  ALERT_CPU_USAGE,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from './enums';

const RESOLVED_MESSAGE_TEXT = i18n.translate(
  'xpack.monitoring.alerts.cpuUsage.email.message.resolved',
  {
    defaultMessage: 'This cluster alert has been resolved: ',
  }
);

const RESOLVED = i18n.translate('xpack.monitoring.alerts.cpuUsage.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.cpuUsage.firing', {
  defaultMessage: 'firing',
});

const DEFAULT_THRESHOLD = -1;

export class CpuUsageAlert extends BaseAlert {
  public type = ALERT_CPU_USAGE;
  public label = 'CPU Usage';

  protected async fetchData(
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
    }
    const stats = await fetchCpuUsageNodeStats(callCluster, clusters, esIndexPattern);
    const threshold =
      parseInt(await uiSettings.get<string>(ALERT_CPU_USAGE_THRESHOLD_CONFIG), 10) ||
      DEFAULT_THRESHOLD;
    // TODO: ignore single spikes? look for consistency?
    return stats.map(stat => {
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
        shouldFire: cpuUsage > threshold,
        severity: AlertSeverity.Danger,
        meta: stat,
      };
    });
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
        defaultMessage: `Node {nodeName} is reporting cpu usage of {cpuUsage}% at #absolute. #start_linkPlease investigate.#end_link`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: stat.cpuUsage,
        },
      }),
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
          url: `/elasticsearch/nodes/${stat.nodeId}`,
        } as AlertMessageLinkToken,
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
