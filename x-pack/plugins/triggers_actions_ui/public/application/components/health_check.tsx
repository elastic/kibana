/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocLinksStart, HttpSetup } from 'kibana/public';

import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { AlertingFrameworkHealth } from '../../types';
import { health } from '../lib/alert_api';
import './health_check.scss';

interface Props {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  http: HttpSetup;
  inFlyout?: boolean;
}

export const HealthCheck: React.FunctionComponent<Props> = ({
  docLinks,
  http,
  children,
  inFlyout = false,
}) => {
  const [alertingHealth, setAlertingHealth] = React.useState<Option<AlertingFrameworkHealth>>(none);

  React.useEffect(() => {
    (async function () {
      setAlertingHealth(some(await health({ http })));
    })();
  }, [http]);

  const className = inFlyout ? 'alertingFlyoutHealthCheck' : 'alertingHealthCheck';

  return pipe(
    alertingHealth,
    fold(
      () => <EuiLoadingSpinner size="m" />,
      (healthCheck) => {
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <Fragment>{children}</Fragment>
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

type PromptErrorProps = Pick<Props, 'docLinks'> & {
  className?: string;
};

const TlsAndEncryptionError = ({
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

const EncryptionError = ({
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
          defaultMessage="You must set an encryption key"
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
              defaultMessage: ' in your kibana.yml file. ',
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
