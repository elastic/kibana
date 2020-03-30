/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold, filter } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DocLinksStart, HttpSetup } from 'kibana/public';
import { AlertingFrameworkHealth } from '../../types';
import { health } from '../lib/alert_api';

interface Props {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  action: string;
  http: HttpSetup;
}

export const AlertActionSecurityCallOut: React.FunctionComponent<Props> = ({
  http,
  action,
  docLinks,
}) => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  const [alertingHealth, setAlertingHealth] = React.useState<Option<AlertingFrameworkHealth>>(none);

  React.useEffect(() => {
    async function fetchSecurityConfigured() {
      setAlertingHealth(some(await health({ http })));
    }

    fetchSecurityConfigured();
  }, [http]);

  return pipe(
    alertingHealth,
    filter(healthCheck => !healthCheck.isSufficientlySecure),
    fold(
      () => <Fragment />,
      () => (
        <Fragment>
          <EuiCallOut
            title={i18n.translate(
              'xpack.triggersActionsUI.components.alertActionSecurityCallOut.tlsDisabledTitle',
              {
                defaultMessage: 'Alert {action} requires TLS between Elasticsearch and Kibana.',
                values: {
                  action,
                },
              }
            )}
            color="warning"
            size="s"
            iconType="iInCircle"
          >
            <EuiButton
              color="warning"
              href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.components.alertActionSecurityCallOut.enableTlsCta"
                defaultMessage="Enable TLS"
              />
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      )
    )
  );
};
