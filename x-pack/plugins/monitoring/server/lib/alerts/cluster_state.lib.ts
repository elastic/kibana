/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { AlertInstance } from '../../../../alerts/server';
import {
  AlertCommonCluster,
  AlertCommonPerClusterMessage,
  AlertCommonPerClusterMessageLinkToken,
} from '../../alerts/types';
import { AlertClusterStateState, AlertCommonPerClusterMessageTokenType } from '../../alerts/enums';

const RESOLVED_SUBJECT = i18n.translate('xpack.monitoring.alerts.clusterStatus.resolvedSubject', {
  defaultMessage: 'RESOLVED X-Pack Monitoring: Cluster Status',
});

const NEW_SUBJECT = i18n.translate('xpack.monitoring.alerts.clusterStatus.newSubject', {
  defaultMessage: 'NEW X-Pack Monitoring: Cluster Status',
});

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterStatus.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterStatus.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

export function executeActions(
  instance: AlertInstance,
  cluster: AlertCommonCluster,
  status: AlertClusterStateState,
  emailAddress: string,
  resolved: boolean = false
) {
  const message =
    status === AlertClusterStateState.Red ? RED_STATUS_MESSAGE : YELLOW_STATUS_MESSAGE;
  if (resolved) {
    instance.scheduleActions('default', {
      subject: RESOLVED_SUBJECT,
      message: `This cluster alert has been resolved: ${message} for cluster '${cluster.clusterName}'`,
      to: emailAddress,
    });
  } else {
    instance.scheduleActions('default', {
      subject: NEW_SUBJECT,
      message: `${message} for cluster '${cluster.clusterName}'`,
      to: emailAddress,
    });
  }
}

export function getUiMessage(
  status: AlertClusterStateState,
  resolved: boolean = false
): AlertCommonPerClusterMessage {
  if (resolved) {
    return {
      text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.resolvedMessage', {
        defaultMessage: `Elasticsearch cluster status is green.`,
      }),
    };
  }
  const message =
    status === AlertClusterStateState.Red ? RED_STATUS_MESSAGE : YELLOW_STATUS_MESSAGE;
  return {
    text: i18n.translate('xpack.monitoring.alerts.clusterStatus.ui.firingMessage', {
      defaultMessage: `Elasticsearch cluster status is {status}. #start_link{message}#end_link`,
      values: {
        status,
        message,
      },
    }),
    tokens: [
      {
        startToken: '#start_link',
        endToken: '#end_link',
        type: AlertCommonPerClusterMessageTokenType.Link,
        url: 'elasticsearch/indices',
      } as AlertCommonPerClusterMessageLinkToken,
    ],
  };
}
