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

import { DocLinksStart } from 'kibana/public';
import {
  ComponentOpts as BulkOperationsComponentOpts,
  withBulkAlertOperations,
} from '../sections/common/components/with_bulk_alert_api_operations';

interface Health {
  canGenerateApiKeys: boolean;
}

type Props = { docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'> } & Pick<
  BulkOperationsComponentOpts,
  'health'
>;

export const SecurityEnabledCallOut: React.FunctionComponent<Props> = ({ health, docLinks }) => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  const [alertingHealth, setAlertingHealth] = React.useState<Option<Health>>(none);

  React.useEffect(() => {
    async function fetchSecurityConfigured() {
      setAlertingHealth(some(await health()));
    }

    fetchSecurityConfigured();
  }, [health]);

  return pipe(
    alertingHealth,
    filter(healthCheck => !healthCheck?.canGenerateApiKeys),
    fold(
      () => <Fragment />,
      () => (
        <Fragment>
          <EuiCallOut
            title={i18n.translate(
              'xpack.triggersActionsUI.components.securityCallOut.tlsDisabledTitle',
              {
                defaultMessage: 'Transport Layer Security is not enabled',
              }
            )}
            color="primary"
            iconType="iInCircle"
          >
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.securityCallOut.tlsDisabledDescription"
                defaultMessage="Alerting relies upon API keys, which requires TLS between Elasticsearch and Kibana when security is enabled. Creating alerts is currently disabled."
              />
            </p>
            <EuiButton
              href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.components.securityCallOut.enableTlsCta"
                defaultMessage="Enabled TLS"
              />
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      )
    )
  );
};

export const SecurityEnabledCallOutWithApi = withBulkAlertOperations(SecurityEnabledCallOut);
