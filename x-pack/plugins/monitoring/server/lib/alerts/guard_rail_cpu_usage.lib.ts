/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'kibana/server';
import { AlertInstance } from '../../../../alerting/server';
import {
  AlertMessageLinkToken,
  AlertMessageTimeToken,
  AlertMessage,
  AlertCpuUsageState,
  AlertCpuUsageNodeStats,
  AlertCluster,
} from '../../alerts/types';
import {
  ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
  MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD,
  MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THROTTLE,
} from '../../../common/constants';
import { AlertMessageTokenType } from '../../alerts/enums';
import { MonitoringConfig } from '../../config';

const RESOLVED_SUBJECT_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject.resolved', {
  defaultMessage: 'RESOLVED',
});

const NEW_SUBJECT_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject.new', {
  defaultMessage: 'NEW',
});

const SUBJECT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject', {
  defaultMessage: 'X-Pack Monitoring: CPU Usage exceeded threshold',
});

const RESOLVED_MESSAGE_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.message.resolved', {
  defaultMessage: 'This cluster alert has been resolved: ',
});

function tokenize(message: string, config: MonitoringConfig) {
  let tokenized = message;
  const tokens = config.alerts.cpu_usage.email.tokens;
  for (const name in tokens) {
    if (tokens.hasOwnProperty(name)) {
      tokenized = tokenized.replace(`{${name}}`, tokens[name]);
    }
  }
  return tokenized;
}

export function executeActions(
  instance: AlertInstance,
  alertState: AlertCpuUsageState,
  stat: AlertCpuUsageNodeStats,
  cluster: AlertCluster,
  kibanaUrl: string,
  config: MonitoringConfig,
  emailAddress: string
) {
  const subject = tokenize(
    `${!alertState.ui.isFiring ? RESOLVED_SUBJECT_TEXT : NEW_SUBJECT_TEXT} ${config.alerts.cpu_usage
      .email.subject || SUBJECT}`,
    config
  );
  const url = `${kibanaUrl}/app/monitoring#/alert/${ALERT_GUARD_RAIL_TYPE_CPU_USAGE}`;
  const message = tokenize(
    `${alertState.ui.isFiring ? '' : RESOLVED_MESSAGE_TEXT} ${config.alerts.cpu_usage.email
      .message ||
      i18n.translate('xpack.monitoring.alerts.cpuUsage.message', {
        defaultMessage: `We detected that **{nodeName}** in **{clusterName}** is reporting cpu usage of **{cpuUsage}%**. [Click to view more]({url})`,
        values: {
          clusterName: cluster.clusterName,
          cpuUsage: alertState.cpuUsage,
          nodeName: stat.nodeName,
          url,
        },
      })}`,
    config
  );

  instance.scheduleActions('default', {
    subject,
    message,
    to: emailAddress,
  });
}

export function getUiMessage(
  alertState: AlertCpuUsageState,
  stat: AlertCpuUsageNodeStats
): AlertMessage {
  if (!alertState.ui.isFiring) {
    return {
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.resolvedMessage', {
        defaultMessage: `The cpu usage on node {nodeName} is now under the threshold, currently reporting at {cpuUsage}% as of #resolved`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: alertState.cpuUsage,
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
        cpuUsage: alertState.cpuUsage,
      },
    }),
    tokens: [
      // {
      //   startToken: '#relative',
      //   type: AlertMessageTokenType.Time,
      //   isRelative: true,
      //   isAbsolute: false,
      // } as AlertMessageTimeToken,
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

export async function getThreshold(uiSettings: IUiSettingsClient) {
  const raw = await uiSettings.get<string>(MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD);
  return parseInt(raw, 10);
}

export async function getThrottle(uiSettings: IUiSettingsClient) {
  return await uiSettings.get<string>(MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THROTTLE);
}
