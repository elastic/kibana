/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiLink, EuiCode, EuiText } from '@elastic/eui';
import { Legacy } from '../../legacy_shims';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
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
            defaultMessage: `You must enable Transport Layer Security between Kibana and Elasticsearch 
              and configure an encryption key in your kibana.yml file to use the Alerting feature.`,
          })}
        </p>
        <EuiSpacer />
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

const showEncryptionError = () => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;

  Legacy.shims.toastNotifications.addWarning(
    {
      title: toMountPoint(
        <FormattedMessage
          id="xpack.monitoring.healthCheck.encryptionErrorTitle"
          defaultMessage="You must set an encryption key"
        />
      ),
      text: toMountPoint(
        <div role="banner">
          {i18n.translate('xpack.monitoring.healthCheck.encryptionErrorBeforeKey', {
            defaultMessage: 'To create an alert, set a value for ',
          })}
          <EuiText size="xs">
            <EuiCode>{'xpack.encryptedSavedObjects.encryptionKey'}</EuiCode>
          </EuiText>
          {i18n.translate('xpack.monitoring.healthCheck.encryptionErrorAfterKey', {
            defaultMessage: ' in your kibana.yml file. ',
          })}
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
    },
    {}
  );
};

const showTlsError = () => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;

  Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.healthCheck.tlsErrorTitle"
        defaultMessage="You must enable Transport Layer Security"
      />
    ),
    text: toMountPoint(
      <div role="banner">
        {i18n.translate('xpack.monitoring.healthCheck.tlsError', {
          defaultMessage:
            'Alerting relies on API keys, which require TLS between Elasticsearch and Kibana. ',
        })}
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`}
          external
          target="_blank"
        >
          {i18n.translate('xpack.monitoring.healthCheck.tlsErrorAction', {
            defaultMessage: 'Learn how to enable TLS.',
          })}
        </EuiLink>
      </div>
    ),
  });
};

export const showSecurityToast = (alertingHealth: AlertingFrameworkHealth) => {
  const { isSufficientlySecure, hasPermanentEncryptionKey } = alertingHealth;
  if (
    Array.isArray(alertingHealth) ||
    (!alertingHealth.hasOwnProperty('isSufficientlySecure') &&
      !alertingHealth.hasOwnProperty('hasPermanentEncryptionKey'))
  ) {
    return;
  }

  if (!isSufficientlySecure && !hasPermanentEncryptionKey) {
    showTlsAndEncryptionError();
  } else if (!isSufficientlySecure) {
    showTlsError();
  } else if (!hasPermanentEncryptionKey) {
    showEncryptionError();
  }
};
