/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { AlertInstance } from '../../../../alerting/server';
import {
  AlertCommonPerClusterMessageLinkToken,
  AlertCommonPerClusterMessageTimeToken,
  AlertCommonCluster,
  AlertCommonPerClusterMessage,
} from '../../alerts/types';
import { AlertCommonPerClusterMessageTokenType } from '../../alerts/enums';
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
  cluster: AlertCommonCluster,
  config: MonitoringConfig,
  nodeName: string,
  cpuUsage: number,
  dateFormat: string,
  emailAddress: string,
  resolved: boolean = false
) {
  const subject = tokenize(
    `${resolved ? RESOLVED_SUBJECT_TEXT : NEW_SUBJECT_TEXT} ${config.alerts.cpu_usage.email
      .subject || SUBJECT}`,
    config
  );
  const message = tokenize(
    `${resolved ? RESOLVED_MESSAGE_TEXT : ''} ${config.alerts.cpu_usage.email.subject ||
      i18n.translate('xpack.monitoring.alerts.cpuUsage.message', {
        defaultMessage: `Cluster '{clusterName}' is reporting cpu usage of {cpuUsage}% on node {nodeName}.`,
        values: {
          clusterName: cluster.clusterName,
          cpuUsage,
          nodeName,
        },
      })}`,
    config
  );
  if (resolved) {
    instance.scheduleActions('default', {
      subject,
      message,
      to: emailAddress,
    });
  } else {
    instance.scheduleActions('default', {
      subject,
      message,
      to: emailAddress,
    });
  }
}

export function getUiMessage(
  cpuUsage: number,
  nodeName: string,
  timestamp: number,
  resolved: boolean = false
): AlertCommonPerClusterMessage {
  if (resolved) {
    return {
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.resolvedMessage', {
        defaultMessage: `The cpu usage on node {nodeName} is now under the threshold, currently reporting at {cpuUsage}% as of #resolved`,
        values: {
          nodeName,
          cpuUsage,
        },
      }),
      tokens: [
        {
          startToken: '#resolved',
          type: AlertCommonPerClusterMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp,
        } as AlertCommonPerClusterMessageTimeToken,
      ],
    };
  }
  return {
    text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.firingMessage', {
      defaultMessage: `Node {nodeName} is reporting cpu usage of {cpuUsage}% at #absolute. #start_linkPlease investigate.#end_link`,
      values: {
        nodeName,
        cpuUsage,
      },
    }),
    tokens: [
      // {
      //   startToken: '#relative',
      //   type: AlertCommonPerClusterMessageTokenType.Time,
      //   isRelative: true,
      //   isAbsolute: false,
      // } as AlertCommonPerClusterMessageTimeToken,
      {
        startToken: '#absolute',
        type: AlertCommonPerClusterMessageTokenType.Time,
        isAbsolute: true,
        isRelative: false,
        timestamp,
      } as AlertCommonPerClusterMessageTimeToken,
      {
        startToken: '#start_link',
        endToken: '#end_link',
        type: AlertCommonPerClusterMessageTokenType.Link,
        url: `elasticsearch/nodes/${nodeName}`,
      } as AlertCommonPerClusterMessageLinkToken,
    ],
  };
}
