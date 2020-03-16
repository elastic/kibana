/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold, filter } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { promiseResult, resolveErr } from '../lib/result_type';

interface Props {
  http: HttpSetup;
}

interface SecurityConfig {
  areApiKeysEnabled: boolean;
}

export const SecurityEnabledCallOut: React.FunctionComponent<Props> = ({ http }) => {
  const [securityConfig, setSecurityConfig] = React.useState<Option<SecurityConfig>>(none);

  React.useEffect(() => {
    async function fetchSecurityConfigured() {
      setSecurityConfig(
        some(
          resolveErr(
            await promiseResult<SecurityConfig, Error>(
              http.get('/internal/security/api_key/privileges', {
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/json',
                },
              })
            ),
            // if the api call fails we assume it means Security is disabled, in which case,
            // apiKeys are enabled by default
            () => ({ areApiKeysEnabled: true })
          )
        )
      );
    }

    fetchSecurityConfigured();
  }, [http]);

  return pipe(
    securityConfig,
    filter(privileges => {
      return !privileges?.areApiKeysEnabled;
    }),
    fold(
      () => <Fragment />,
      () => (
        <EuiCallOut
          title={i18n.translate(
            'xpack.triggersActionsUI.components.securityCallOut.tlsDisabledTitle',
            {
              defaultMessage: 'Transport Layer Security is not enabled',
            }
          )}
          color="primary"
          iconType="info"
        >
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.securityCallOut.tlsDisabledDescription"
              defaultMessage="Alerting relies upon API keys, which requires TLS between Elasticsearch and Kibana when security is enabled. Creating alerts is currently disabled."
            />
          </p>
          <EuiButton href="#">
            <FormattedMessage
              id="xpack.triggersActionsUI.components.securityCallOut.enableTlsCta"
              defaultMessage="Enabled TLS"
            />
          </EuiButton>
        </EuiCallOut>
      )
    )
  );
};
