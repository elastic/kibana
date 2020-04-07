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

interface Props {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  http: HttpSetup;
  alignToTop?: boolean;
}

export const HealthCheck: React.FunctionComponent<Props> = ({
  docLinks,
  http,
  children,
  alignToTop = false,
}) => {
  const [alertingHealth, setAlertingHealth] = React.useState<Option<AlertingFrameworkHealth>>(none);

  React.useEffect(() => {
    (async function() {
      setAlertingHealth(some(await health({ http })));
    })();
  }, [http]);

  const style = alignToTop ? { marginTop: '1em' } : {};

  return pipe(
    alertingHealth,
    fold(
      () => <EuiLoadingSpinner size="m" />,
      healthCheck => {
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <Fragment>{children}</Fragment>
        ) : !healthCheck.isSufficientlySecure && !healthCheck.hasPermanentEncryptionKey ? (
          <TlsAndEncryptionError docLinks={docLinks} style={style} />
        ) : !healthCheck.hasPermanentEncryptionKey ? (
          <EncryptionError docLinks={docLinks} style={style} />
        ) : (
          <TlsError docLinks={docLinks} style={style} />
        );
      }
    )
  );
};

type PromptErrorProps = Pick<Props, 'docLinks'> & {
  style?: React.CSSProperties;
};

const TlsAndEncryptionError = ({
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  style,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    style={style ?? {}}
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
    }
  />
);

const EncryptionError = ({
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  style,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    style={style ?? {}}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionErrorTitle"
          defaultMessage="You must set an encryption key"
        />
      </h2>
    }
    body={
      <p role="banner">
        {i18n.translate('xpack.triggersActionsUI.components.healthCheck.encryptionErrorBeforeKey', {
          defaultMessage: 'To create an alert, set a value for ',
        })}
        <EuiCode>{'xpack.encrypted_saved_objects.encryptionKey'}</EuiCode>
        {i18n.translate('xpack.triggersActionsUI.components.healthCheck.encryptionErrorAfterKey', {
          defaultMessage: ' in your kibana.yml file. ',
        })}
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`}
          external
          target="_blank"
        >
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.encryptionErrorAction', {
            defaultMessage: 'Learn how.',
          })}
        </EuiLink>
      </p>
    }
  />
);

const TlsError = ({
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  style,
}: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    style={style ?? {}}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionErrorTitle"
          defaultMessage="You must enable Transport Layer Security"
        />
      </h2>
    }
    body={
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
    }
  />
);
