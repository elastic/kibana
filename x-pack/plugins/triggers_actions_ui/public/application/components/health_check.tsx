/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import { EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocLinksStart, HttpSetup } from 'kibana/public';

import { AlertingFrameworkHealth } from '../../types';
import { health } from '../lib/alert_api';

import { ActionNeededPrompt } from './prompts/action_needed_prompt';

interface Props {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  http: HttpSetup;
}

export const HealthCheck: React.FunctionComponent<Props> = ({ docLinks, http, children }) => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  const [alertingHealth, setAlertingHealth] = React.useState<Option<AlertingFrameworkHealth>>(none);

  React.useEffect(() => {
    (async function() {
      setAlertingHealth(some(await health({ http })));
    })();
  }, [http]);

  return pipe(
    alertingHealth,
    fold(
      () => <EuiLoadingSpinner size="m" />,
      healthCheck => {
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <Fragment>{children}</Fragment>
        ) : (
          <ActionNeededPrompt>
            {!healthCheck.isSufficientlySecure && !healthCheck.hasPermanentEncryptionKey ? (
              <p role="banner">
                {i18n.translate(
                  'xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionError',
                  {
                    defaultMessage:
                      'Alerting relies on API keys, which require TLS between Elasticsearch and Kibana, and a permanent Encryption Key. Learn how to ',
                  }
                )}
                <EuiLink
                  href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alerting-getting-started.html#alerting-setup-prerequisites`}
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.triggersActionsUI.components.healthCheck.tlsAndEncryptionErrorAction',
                    {
                      defaultMessage: 'enable TLS and a permanent Encryption Key',
                    }
                  )}
                </EuiLink>
              </p>
            ) : !healthCheck.hasPermanentEncryptionKey ? (
              <p role="banner">
                {i18n.translate('xpack.triggersActionsUI.components.healthCheck.encryptionError', {
                  defaultMessage:
                    'Alerting relies on API keys, which requires a permanent Encryption Key. Learn how to ',
                })}
                <EuiLink
                  href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`}
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.triggersActionsUI.components.healthCheck.encryptionErrorAction',
                    {
                      defaultMessage: 'set a permanent Encryption Key',
                    }
                  )}
                </EuiLink>
              </p>
            ) : (
              <p role="banner">
                {i18n.translate('xpack.triggersActionsUI.components.healthCheck.tlsError', {
                  defaultMessage:
                    'Alerting relies on API keys, which require TLS between Elasticsearch and Kibana. Learn how to ',
                })}
                <EuiLink
                  href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`}
                  external
                  target="_blank"
                >
                  {i18n.translate('xpack.triggersActionsUI.components.healthCheck.tlsErrorAction', {
                    defaultMessage: 'enable TLS',
                  })}
                </EuiLink>
              </p>
            )}
          </ActionNeededPrompt>
        );
      }
    )
  );
};
