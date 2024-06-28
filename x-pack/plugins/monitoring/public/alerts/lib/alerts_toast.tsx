/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiLink } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Legacy } from '../../legacy_shims';
import { MonitoringStartServices } from '../../types';

export interface EnableAlertResponse {
  isSufficientlySecure?: boolean;
  hasPermanentEncryptionKey?: boolean;
}

const showApiKeyAndEncryptionError = (services: MonitoringStartServices) => {
  const settingsUrl = Legacy.shims.docLinks.links.alerting.generalSettings;

  Legacy.shims.toastNotifications.addWarning({
    title: i18n.translate('xpack.monitoring.healthCheck.tlsAndEncryptionErrorTitle', {
      defaultMessage: 'Additional setup required',
    }),
    text: toMountPoint(
      <div>
        <p>
          {i18n.translate('xpack.monitoring.healthCheck.tlsAndEncryptionError', {
            defaultMessage:
              'Stack Monitoring rules require API keys to be enabled and an encryption key to be configured.',
          })}
        </p>
        <EuiSpacer size="xs" />
        <EuiLink href={settingsUrl} external target="_blank">
          {i18n.translate('xpack.monitoring.healthCheck.encryptionErrorAction', {
            defaultMessage: 'Learn how.',
          })}
        </EuiLink>
      </div>,
      services
    ),
  });
};

const showAlertsCreatedConfirmation = () => {
  Legacy.shims.toastNotifications.addWarning({
    title: i18n.translate('xpack.monitoring.healthCheck.alertsCreatedConfirmation.title', {
      defaultMessage: 'New alerts created',
    }),
    text: i18n.translate('xpack.monitoring.healthCheck.alertsCreatedConfirmation.text', {
      defaultMessage:
        'Review the alert definition using Setup mode and configure additional action connectors to get notified via your favorite method.',
    }),
    'data-test-subj': 'alertsCreatedToast',
  });
};

export const showAlertsToast = (
  response: EnableAlertResponse,
  services: MonitoringStartServices
) => {
  const { isSufficientlySecure, hasPermanentEncryptionKey } = response;

  if (isSufficientlySecure === false || hasPermanentEncryptionKey === false) {
    showApiKeyAndEncryptionError(services);
  } else {
    showAlertsCreatedConfirmation();
  }
};
