/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiLink } from '@elastic/eui';
import { Legacy } from '../../legacy_shims';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

export interface EnableAlertResponse {
  isSufficientlySecure?: boolean;
  hasPermanentEncryptionKey?: boolean;
  disabledWatcherClusterAlerts?: boolean;
}

const showApiKeyAndEncryptionError = () => {
  const settingsUrl = Legacy.shims.docLinks.links.alerting.generalSettings;

  Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.healthCheck.tlsAndEncryptionErrorTitle"
        defaultMessage="Additional setup required"
      />
    ),
    text: toMountPoint(
      <div>
        <p>
          {i18n.translate('xpack.monitoring.healthCheck.tlsAndEncryptionError', {
            defaultMessage: `Stack Monitoring rules require API keys to be enabled and an encryption key to be configured.`,
          })}
        </p>
        <EuiSpacer size="xs" />
        <EuiLink href={settingsUrl} external target="_blank">
          {i18n.translate('xpack.monitoring.healthCheck.encryptionErrorAction', {
            defaultMessage: 'Learn how.',
          })}
        </EuiLink>
      </div>
    ),
  });
};

const showUnableToDisableWatcherClusterAlertsError = () => {
  const settingsUrl = Legacy.shims.docLinks.links.alerting.generalSettings;

  Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.healthCheck.unableToDisableWatches.title"
        defaultMessage="Legacy cluster alerts still active"
      />
    ),
    text: toMountPoint(
      <div>
        <p>
          {i18n.translate('xpack.monitoring.healthCheck.unableToDisableWatches.text', {
            defaultMessage: `We failed to remove legacy cluster alerts. Please check the Kibana server log for more details, or try again later.`,
          })}
        </p>
        <EuiSpacer size="xs" />
        <EuiLink href={settingsUrl} external target="_blank">
          {i18n.translate('xpack.monitoring.healthCheck.unableToDisableWatches.action', {
            defaultMessage: 'Learn more.',
          })}
        </EuiLink>
      </div>
    ),
  });
};

const showDisabledWatcherClusterAlertsError = () => {
  Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.healthCheck.disabledWatches.title"
        defaultMessage="New alerts created"
      />
    ),
    text: toMountPoint(
      <p>
        {i18n.translate('xpack.monitoring.healthCheck.disabledWatches.text', {
          defaultMessage: `Review the alert definition using Setup mode and configure additional action connectors to get notified via your favorite method.`,
        })}
      </p>
    ),
    'data-test-subj': 'alertsCreatedToast',
  });
};

export const showAlertsToast = (response: EnableAlertResponse) => {
  const { isSufficientlySecure, hasPermanentEncryptionKey, disabledWatcherClusterAlerts } =
    response;

  if (isSufficientlySecure === false || hasPermanentEncryptionKey === false) {
    showApiKeyAndEncryptionError();
  } else if (disabledWatcherClusterAlerts === false) {
    showUnableToDisableWatcherClusterAlertsError();
  } else if (disabledWatcherClusterAlerts === true) {
    showDisabledWatcherClusterAlertsError();
  }
};
