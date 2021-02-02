/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { DocLinksStart } from 'kibana/public';
import { alertingFrameworkHealth } from '../lib/alert_api';
import './health_check.scss';
import { useHealthContext } from '../context/health_context';
import { useKibana } from '../../common/lib/kibana';
import { CenterJustifiedSpinner } from './center_justified_spinner';
import { triggersActionsUiHealth } from '../../common/lib/health_api';

interface Props {
  inFlyout?: boolean;
  waitForCheck: boolean;
}

interface HealthStatus {
  isAlertsAvailable: boolean;
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const HealthCheck: React.FunctionComponent<Props> = ({
  children,
  waitForCheck,
  inFlyout = false,
}) => {
  const { http, docLinks } = useKibana().services;
  const { setLoadingHealthCheck } = useHealthContext();
  const [alertingHealth, setAlertingHealth] = React.useState<Option<HealthStatus>>(none);

  React.useEffect(() => {
    (async function () {
      setLoadingHealthCheck(true);
      const triggersActionsUiHealthStatus = await triggersActionsUiHealth({ http });
      const healthStatus: HealthStatus = {
        ...triggersActionsUiHealthStatus,
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: false,
      };
      if (healthStatus.isAlertsAvailable) {
        const alertingHealthResult = await alertingFrameworkHealth({ http });
        healthStatus.isSufficientlySecure = alertingHealthResult.isSufficientlySecure;
        healthStatus.hasPermanentEncryptionKey = alertingHealthResult.hasPermanentEncryptionKey;
      }

      setAlertingHealth(some(healthStatus));
      setLoadingHealthCheck(false);
    })();
  }, [http, setLoadingHealthCheck]);

  const className = inFlyout ? 'alertingFlyoutHealthCheck' : 'alertingHealthCheck';

  return pipe(
    alertingHealth,
    fold(
      () =>
        waitForCheck ? (
          <Fragment>
            <EuiSpacer size="m" />
            <CenterJustifiedSpinner />
          </Fragment>
        ) : (
          <Fragment>{children}</Fragment>
        ),
      (healthCheck) => {
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <Fragment>{children}</Fragment>
        ) : !healthCheck.isAlertsAvailable ? (
          <AlertsError docLinks={docLinks} className={className} />
        ) : !healthCheck.isSufficientlySecure && !healthCheck.hasPermanentEncryptionKey ? (
          <TlsAndEncryptionError docLinks={docLinks} className={className} />
        ) : !healthCheck.hasPermanentEncryptionKey ? (
          <EncryptionError docLinks={docLinks} className={className} />
        ) : (
          <TlsError docLinks={docLinks} className={className} />
        );
      }
    )
  );
};

interface PromptErrorProps {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  className?: string;
}

const EncryptionError = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  className,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.encryptionErrorTitle"
          defaultMessage="Encrypted saved objects are not available"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate(
            'xpack.triggersActionsUI.components.healthCheck.encryptionErrorBeforeKey',
            {
              defaultMessage: 'To create an alert, set a value for ',
            }
          )}
          <EuiCode>{'xpack.encryptedSavedObjects.encryptionKey'}</EuiCode>
          {i18n.translate(
            'xpack.triggersActionsUI.components.healthCheck.encryptionErrorAfterKey',
            {
              defaultMessage:
                ' in your kibana.yml file and ensure the Encrypted Saved Objects plugin is enabled. ',
            }
          )}
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`}
            external
            target="_blank"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.components.healthCheck.encryptionErrorAction',
              {
                defaultMessage: 'Learn how.',
              }
            )}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const TlsError = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  className,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.tlsErrorTitle"
          defaultMessage="You must enable Transport Layer Security"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.tlsError', {
            defaultMessage:
              'Alerting relies on API keys, which require TLS between Elasticsearch and Kibana. ',
          })}
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`}
            external
            target="_blank"
          >
            {i18n.translate('xpack.triggersActionsUI.components.healthCheck.tlsErrorAction', {
              defaultMessage: 'Learn how to enable TLS.',
            })}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const AlertsError = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  className,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="alertsNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.alertsErrorTitle"
          defaultMessage="You must enable Alerts and Actions"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.alertsError', {
            defaultMessage: 'To create an alert, set alerts and actions plugins enabled. ',
          })}
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html`}
            external
            target="_blank"
          >
            {i18n.translate('xpack.triggersActionsUI.components.healthCheck.alertsErrorAction', {
              defaultMessage: 'Learn how to enable Alerts and Actions.',
            })}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const TlsAndEncryptionError = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  className,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionErrorTitle"
          defaultMessage="Additional setup required"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionError', {
            defaultMessage:
              'You must enable Transport Layer Security between Kibana and Elasticsearch and configure an encryption key in your kibana.yml file. ',
          })}
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alerting-getting-started.html#alerting-setup-prerequisites`}
            external
            target="_blank"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionErrorAction',
              {
                defaultMessage: 'Learn how',
              }
            )}
          </EuiLink>
        </p>
      </div>
    }
  />
);
