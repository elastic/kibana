/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { AlertInstance } from '../../../../alerts/server';
import {
  AlertCommonPerClusterMessageLinkToken,
  AlertCommonPerClusterMessageTimeToken,
  AlertCommonCluster,
  AlertCommonPerClusterMessage,
} from '../../alerts/types';
import { AlertCommonPerClusterMessageTokenType } from '../../alerts/enums';

const RESOLVED_SUBJECT = i18n.translate(
  'xpack.monitoring.alerts.licenseExpiration.resolvedSubject',
  {
    defaultMessage: 'RESOLVED X-Pack Monitoring: License Expiration',
  }
);

const NEW_SUBJECT = i18n.translate('xpack.monitoring.alerts.licenseExpiration.newSubject', {
  defaultMessage: 'NEW X-Pack Monitoring: License Expiration',
});

export function executeActions(
  instance: AlertInstance,
  cluster: AlertCommonCluster,
  $expiry: Moment,
  dateFormat: string,
  emailAddress: string,
  resolved: boolean = false
) {
  if (resolved) {
    instance.scheduleActions('default', {
      subject: RESOLVED_SUBJECT,
      message: `This cluster alert has been resolved: Cluster '${
        cluster.clusterName
      }' license was going to expire on ${$expiry.format(dateFormat)}.`,
      to: emailAddress,
    });
  } else {
    instance.scheduleActions('default', {
      subject: NEW_SUBJECT,
      message: `Cluster '${cluster.clusterName}' license is going to expire on ${$expiry.format(
        dateFormat
      )}. Please update your license.`,
      to: emailAddress,
    });
  }
}

export function getUiMessage(resolved: boolean = false): AlertCommonPerClusterMessage {
  if (resolved) {
    return {
      text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.resolvedMessage', {
        defaultMessage: `This cluster's license is active.`,
      }),
    };
  }
  return {
    text: i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
      defaultMessage: `This cluster's license is going to expire in #relative at #absolute. #start_linkPlease update your license.#end_link`,
    }),
    tokens: [
      {
        startToken: '#relative',
        type: AlertCommonPerClusterMessageTokenType.Time,
        isRelative: true,
        isAbsolute: false,
      } as AlertCommonPerClusterMessageTimeToken,
      {
        startToken: '#absolute',
        type: AlertCommonPerClusterMessageTokenType.Time,
        isAbsolute: true,
        isRelative: false,
      } as AlertCommonPerClusterMessageTimeToken,
      {
        startToken: '#start_link',
        endToken: '#end_link',
        type: AlertCommonPerClusterMessageTokenType.Link,
        url: 'license',
      } as AlertCommonPerClusterMessageLinkToken,
    ],
  };
}
