/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { Option, none, some, fold, isSome } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiEmptyPrompt } from '@elastic/eui';
import { DocLinksStart, HttpSetup } from '@kbn/core/public';
import { AlertingFrameworkHealth } from '@kbn/alerting-types';
import './health_check.scss';
import { fetchUiHealthStatus as triggersActionsUiHealth } from '@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status';
import { fetchAlertingFrameworkHealth as alertingFrameworkHealth } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health';
import { useHealthContext } from '../context/health_context';
import { useKibana } from '../../common/lib/kibana';
import { CenterJustifiedSpinner } from './center_justified_spinner';

interface Props {
  inFlyout?: boolean;
  waitForCheck: boolean;
}

interface HealthStatus {
  isRulesAvailable: boolean;
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const HealthCheck: FC<PropsWithChildren<Props>> = ({
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
      if (healthStatus.isRulesAvailable) {
        // Get the framework health, but if not available, do NOT cause the
        // framework health errors/toasts to appear, since the state is
        // actually unknown. These also need to be set to clear the busy
        // indicator.
        const alertingHealthResult = await getAlertingFrameworkHealth(http);
        if (isSome(alertingHealthResult)) {
          healthStatus.isSufficientlySecure = alertingHealthResult.value.isSufficientlySecure;
          healthStatus.hasPermanentEncryptionKey =
            alertingHealthResult.value.hasPermanentEncryptionKey;
        } else {
          healthStatus.isSufficientlySecure = true;
          healthStatus.hasPermanentEncryptionKey = true;
        }
        setAlertingHealth(some(healthStatus));
      }

      setLoadingHealthCheck(false);
    })();
  }, [http, setLoadingHealthCheck]);

  const className = inFlyout ? 'alertingFlyoutHealthCheck' : 'alertingHealthCheck';

  return pipe(
    alertingHealth,
    fold(
      () =>
        waitForCheck ? (
          <>
            <EuiSpacer size="m" />
            <CenterJustifiedSpinner />
          </>
        ) : (
          <>{children}</>
        ),
      (healthCheck) => {
        return healthCheck?.isSufficientlySecure && healthCheck?.hasPermanentEncryptionKey ? (
          <>{children}</>
        ) : !healthCheck.isRulesAvailable ? (
          <AlertsError docLinks={docLinks} className={className} />
        ) : !healthCheck.isSufficientlySecure && !healthCheck.hasPermanentEncryptionKey ? (
          <ApiKeysAndEncryptionError docLinks={docLinks} className={className} />
        ) : !healthCheck.hasPermanentEncryptionKey ? (
          <EncryptionError docLinks={docLinks} className={className} />
        ) : (
          <ApiKeysDisabledError docLinks={docLinks} className={className} />
        );
      }
    )
  );
};

// Return as an Option, returning none if error occurred getting health.
// Currently, alerting health returns a 403 if the user is not authorized
// for rules.
async function getAlertingFrameworkHealth(
  http: HttpSetup
): Promise<Option<AlertingFrameworkHealth>> {
  try {
    return some(await alertingFrameworkHealth({ http }));
  } catch (err) {
    return none;
  }
}

interface PromptErrorProps {
  docLinks: DocLinksStart;
  className?: string;
}

const EncryptionError = ({ docLinks, className }: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.encryptionErrorTitle"
          defaultMessage="Additional setup required"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate(
            'xpack.triggersActionsUI.components.healthCheck.encryptionErrorBeforeKey',
            {
              defaultMessage: 'You must configure an encryption key to use Alerting. ',
            }
          )}
          <EuiLink href={docLinks.links.alerting.generalSettings} external target="_blank">
            {i18n.translate(
              'xpack.triggersActionsUI.components.healthCheck.encryptionErrorAction',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const ApiKeysDisabledError = ({ docLinks, className }: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.apiKeysDisabledErrorTitle"
          defaultMessage="Additional setup required"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.apiKeysDisabledError', {
            defaultMessage: 'You must enable API keys to use Alerting. ',
          })}
          <EuiLink
            href={docLinks.links.security.elasticsearchEnableApiKeys}
            external
            target="_blank"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.components.healthCheck.apiKeysDisabledErrorAction',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const AlertsError = ({ docLinks, className }: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="alertsNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.alertsErrorTitle"
          defaultMessage="You must enable Alerting and Actions"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate('xpack.triggersActionsUI.components.healthCheck.alertsError', {
            defaultMessage: 'To create a rule, you must enable the alerting and actions plugins. ',
          })}
          <EuiLink href={docLinks.links.alerting.generalSettings} external target="_blank">
            {i18n.translate('xpack.triggersActionsUI.components.healthCheck.alertsErrorAction', {
              defaultMessage: 'Learn how.',
            })}
          </EuiLink>
        </p>
      </div>
    }
  />
);

const ApiKeysAndEncryptionError = ({ docLinks, className }: PromptErrorProps) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="actionNeededEmptyPrompt"
    className={className}
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.healthCheck.apiKeysAndEncryptionErrorTitle"
          defaultMessage="Additional setup required"
        />
      </h2>
    }
    body={
      <div className={`${className}__body`}>
        <p role="banner">
          {i18n.translate(
            'xpack.triggersActionsUI.components.healthCheck.apiKeysAndEncryptionError',
            {
              defaultMessage:
                'You must enable API keys and configure an encryption key to use Alerting. ',
            }
          )}
          <EuiLink href={docLinks.links.alerting.setupPrerequisites} external target="_blank">
            {i18n.translate(
              'xpack.triggersActionsUI.components.healthCheck.apiKeysAndEncryptionErrorAction',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        </p>
      </div>
    }
  />
);
