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
import { AlertingFrameworkHealth } from '../../types';

type Props = { docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'> } & Pick<
  BulkOperationsComponentOpts,
  'getHealth'
>;

export const SecurityEnabledCallOut: React.FunctionComponent<Props> = ({ getHealth, docLinks }) => {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  const [alertingHealth, setAlertingHealth] = React.useState<Option<AlertingFrameworkHealth>>(none);

  React.useEffect(() => {
    async function fetchSecurityConfigured() {
      setAlertingHealth(some(await getHealth()));
    }

    fetchSecurityConfigured();
  }, [getHealth]);

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
                defaultMessage: 'Enable Transport Layer Security',
              }
            )}
            color="primary"
            iconType="iInCircle"
          >
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.securityCallOut.tlsDisabledDescription"
                defaultMessage="Alerting relies on API keys, which require TLS between Elasticsearch and Kibana."
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
