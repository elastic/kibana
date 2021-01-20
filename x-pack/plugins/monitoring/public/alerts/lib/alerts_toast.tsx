/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiLink } from '@elastic/eui';
import { Legacy } from '../../legacy_shims';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

export interface EnableAlertResponse {
  isSufficientlySecure?: boolean;
  hasPermanentEncryptionKey?: boolean;
  disabledWatcherClusterAlerts?: boolean;
}

const showTlsAndEncryptionError = () => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;

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
            defaultMessage: `Stack monitoring alerts require Transport Layer Security between Kibana and Elasticsearch, and an encryption key in your kibana.yml file.`,
          })}
        </p>
        <EuiSpacer size="xs" />
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`}
          external
          target="_blank"
        >
          {i18n.translate('xpack.monitoring.healthCheck.encryptionErrorAction', {
            defaultMessage: 'Learn how.',
          })}
        </EuiLink>
      </div>
    ),
  });
};

const showUnableToDisableWatcherClusterAlertsError = () => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;

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
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`}
          external
          target="_blank"
        >
          {i18n.translate('xpack.monitoring.healthCheck.unableToDisableWatches.action', {
            defaultMessage: 'Learn more.',
          })}
        </EuiLink>
      </div>
    ),
  });
};

export const showAlertsToast = (response: EnableAlertResponse) => {
  const {
    isSufficientlySecure,
    hasPermanentEncryptionKey,
    disabledWatcherClusterAlerts,
  } = response;

  if (isSufficientlySecure === false || hasPermanentEncryptionKey === false) {
    showTlsAndEncryptionError();
  } else if (disabledWatcherClusterAlerts === false) {
    showUnableToDisableWatcherClusterAlertsError();
  }
};
