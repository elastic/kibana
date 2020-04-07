/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Option, none, some, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import { EuiCallOut, EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocLinksStart, HttpSetup } from 'kibana/public';
import { AlertingFrameworkHealth } from '../../types';
import { health } from '../lib/alert_api';

interface Props {
  docLinks: Pick<DocLinksStart, 'ELASTIC_WEBSITE_URL' | 'DOC_LINK_VERSION'>;
  action: string;
  http: HttpSetup;
}

export const AlertActionHealthCheck: React.FunctionComponent<Props> = ({
  docLinks,
  http,
  action,
  children,
}) => {
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
        const [title, actionDescription, actionUrl] = getTextByHealthIssue(healthCheck, {
          action,
          docLinks,
        });
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <Fragment>{children}</Fragment>
        ) : (
          <EuiCallOut title={title} color="warning" iconType="iInCircle">
            <EuiButton title={actionDescription} color="warning" href={actionUrl}>
              {actionDescription}
            </EuiButton>
          </EuiCallOut>
        );
      }
    )
  );
};

function getTextByHealthIssue(
  healthCheck: AlertingFrameworkHealth,
  { docLinks, action }: Pick<Props, 'action' | 'docLinks'>
) {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  return !healthCheck.isSufficientlySecure && !healthCheck.hasPermanentEncryptionKey
    ? [
        i18n.translate(
          'xpack.triggersActionsUI.components.alertActionHealthCheck.tlsAndEncryptionError',
          {
            defaultMessage:
              'Alert {action} requires TLS between Elasticsearch and Kibana, and a permanent Encryption Key.',
            values: {
              action,
            },
          }
        ),
        i18n.translate(
          'xpack.triggersActionsUI.components.alertActionHealthCheck.tlsAndEncryptionErrorAction',
          {
            defaultMessage: 'enable TLS and configure an Encryption Key',
          }
        ),
        `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alerting-getting-started.html#alerting-setup-prerequisites`,
      ]
    : !healthCheck.hasPermanentEncryptionKey
    ? [
        i18n.translate(
          'xpack.triggersActionsUI.components.alertActionHealthCheck.encryptionError',
          {
            defaultMessage: 'Alert {action} requires a permanent Encryption Key.',
            values: {
              action,
            },
          }
        ),
        i18n.translate(
          'xpack.triggersActionsUI.components.alertActionHealthCheck.encryptionErrorAction',
          {
            defaultMessage: 'Configure an Encryption Key',
          }
        ),
        `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`,
      ]
    : [
        i18n.translate('xpack.triggersActionsUI.components.alertActionHealthCheck.tlsError', {
          defaultMessage: 'Alert {action} requires TLS between Elasticsearch and Kibana.',
          values: {
            action,
          },
        }),
        i18n.translate('xpack.triggersActionsUI.components.alertActionHealthCheck.tlsErrorAction', {
          defaultMessage: 'enable TLS',
        }),
        `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`,
      ];
}
