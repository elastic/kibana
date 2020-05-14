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
} from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from './enums';

// const RESOLVED_SUBJECT_TEXT = i18n.translate(
//   'xpack.monitoring.alerts.cpuUsage.email.subject.resolved',
//   {
//     defaultMessage: 'RESOLVED',
//   }
// );

// const NEW_SUBJECT_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.email.subject.new', {
//   defaultMessage: 'NEW',
// });

// const SUBJECT = i18n.translate('xpack.monitoring.alerts.cpuUsage.email.subject', {
//   defaultMessage: 'X-Pack Monitoring: CPU Usage exceeded threshold',
// });

const RESOLVED_MESSAGE_TEXT = i18n.translate(
  'xpack.monitoring.alerts.cpuUsage.email.message.resolved',
  {
    defaultMessage: 'This cluster alert has been resolved: ',
  }
);

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
    const threshold = parseInt(await uiSettings.get<string>(ALERT_CPU_USAGE_THRESHOLD_CONFIG), 10);
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
    // const subject = `${
    //   !alertState.ui.isFiring ? RESOLVED_SUBJECT_TEXT : NEW_SUBJECT_TEXT
    // } ${SUBJECT}`;
    const url = `${this.kibanaUrl}/app/monitoring#/alert/${this.type}`;
    const defaults: Record<string, any> = {
      clusterName: cluster.clusterName,
      cpuUsage: stat.cpuUsage,
      nodeName: stat.nodeName,
      url,
    };
    // const message = `${alertState.ui.isFiring ? '' : RESOLVED_MESSAGE_TEXT} ${i18n.translate(
    //   'xpack.monitoring.alerts.cpuUsage.email.message',
    //   {
    //     defaultMessage: `We detected that **{nodeName}** in **{clusterName}** is reporting cpu usage of **{cpuUsage}%**. [Click to view more]({url})`,
    //     values: defaults,
    //   }
    // )}`;

    const logMessage = `${alertState.ui.isFiring ? '' : RESOLVED_MESSAGE_TEXT} ${i18n.translate(
      'xpack.monitoring.alerts.cpuUsage.log.message',
      {
        defaultMessage: `We detected that {nodeName} in {clusterName} is reporting cpu usage of {cpuUsage}%. Want to get emails too? Visit the Stack Monitoring UI in Kibana to find out more.`,
        values: defaults,
      }
    )}`;

    instance.scheduleActions('default', {
      // email_subject: subject,
      // email_message: message,
      // email_to: emailAddress,
      log_message: logMessage,
    });
  }
}
