/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiCallOut,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Legacy } from '../../legacy_shims';
import { Alert, BASE_ALERT_API_PATH } from '../../../../alerts/common';
import { getSetupModeState, addSetupModeCallback, toggleSetupMode } from '../../lib/setup_mode';
import { NUMBER_OF_MIGRATED_ALERTS, ALERT_TYPE_PREFIX } from '../../../common/constants';
import { AlertsConfiguration } from './configuration';

export interface AlertsStatusProps {
  clusterUuid: string;
  emailAddress: string;
}

export const AlertsStatus: React.FC<AlertsStatusProps> = (props: AlertsStatusProps) => {
  const { emailAddress } = props;

  const [setupModeEnabled, setSetupModeEnabled] = React.useState(getSetupModeState().enabled);
  const [kibanaAlerts, setKibanaAlerts] = React.useState<Alert[]>([]);
  const [showMigrationFlyout, setShowMigrationFlyout] = React.useState(false);
  const [isSecurityConfigured, setIsSecurityConfigured] = React.useState(false);

  React.useEffect(() => {
    async function fetchAlertsStatus() {
      const alerts = await Legacy.shims.kfetch({
        method: 'GET',
        pathname: `${BASE_ALERT_API_PATH}/_find`,
      });
      const monitoringAlerts = alerts.data.filter((alert: Alert) =>
        alert.alertTypeId.startsWith(ALERT_TYPE_PREFIX)
      );
      setKibanaAlerts(monitoringAlerts);
    }

    fetchAlertsStatus();
    fetchSecurityConfigured();
  }, [setupModeEnabled, showMigrationFlyout]);

  React.useEffect(() => {
    if (!setupModeEnabled && showMigrationFlyout) {
      setShowMigrationFlyout(false);
    }
  }, [setupModeEnabled, showMigrationFlyout]);

  async function fetchSecurityConfigured() {
    const response = await Legacy.shims.kfetch({
      pathname: '/internal/security/api_key/privileges',
    });
    setIsSecurityConfigured(response.areApiKeysEnabled);
  }

  addSetupModeCallback(() => setSetupModeEnabled(getSetupModeState().enabled));

  function enterSetupModeAndOpenFlyout() {
    toggleSetupMode(true);
    setShowMigrationFlyout(true);
  }

  function getSecurityConfigurationErrorUi() {
    if (isSecurityConfigured) {
      return null;
    }
    const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;
    const link = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/security-settings.html#api-key-service-settings`;
    return (
      <Fragment>
        <EuiSpacer />
        <EuiCallOut
          title={i18n.translate(
            'xpack.monitoring.alerts.configuration.securityConfigurationErrorTitle',
            {
              defaultMessage: 'API keys are not enabled in Elasticsearch',
            }
          )}
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.configuration.securityConfigurationErrorMessage"
              defaultMessage="Refer to the {link} to enable API keys."
              values={{
                link: (
                  <EuiLink href={link} target="_blank">
                    {i18n.translate(
                      'xpack.monitoring.alerts.configuration.securityConfigurationError.docsLinkLabel',
                      {
                        defaultMessage: 'docs',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      </Fragment>
    );
  }

  function renderContent() {
    let flyout = null;
    if (showMigrationFlyout) {
      flyout = (
        <EuiFlyout onClose={() => setShowMigrationFlyout(false)} aria-labelledby="flyoutTitle">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.monitoring.alerts.status.flyoutTitle', {
                  defaultMessage: 'Monitoring alerts',
                })}
              </h2>
            </EuiTitle>
            <EuiText>
              <p>
                {i18n.translate('xpack.monitoring.alerts.status.flyoutSubtitle', {
                  defaultMessage: 'Configure an email server and email address to receive alerts.',
                })}
              </p>
            </EuiText>
            {getSecurityConfigurationErrorUi()}
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <AlertsConfiguration
              emailAddress={emailAddress}
              onDone={() => setShowMigrationFlyout(false)}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    }

    const allMigrated = kibanaAlerts.length >= NUMBER_OF_MIGRATED_ALERTS;
    if (allMigrated) {
      if (setupModeEnabled) {
        return (
          <Fragment>
            <EuiCallOut
              color="success"
              title={i18n.translate('xpack.monitoring.alerts.status.upToDate', {
                defaultMessage: 'Kibana alerting is up to date!',
              })}
              iconType="flag"
            >
              <p>
                <EuiLink onClick={enterSetupModeAndOpenFlyout}>
                  {i18n.translate('xpack.monitoring.alerts.status.manage', {
                    defaultMessage: 'Want to make changes? Click here.',
                  })}
                </EuiLink>
              </p>
            </EuiCallOut>
            {flyout}
          </Fragment>
        );
      }
    } else {
      return (
        <Fragment>
          <EuiCallOut
            color="warning"
            title={i18n.translate('xpack.monitoring.alerts.status.needToMigrateTitle', {
              defaultMessage: 'Hey! We made alerting better!',
            })}
          >
            <p>
              <EuiLink onClick={enterSetupModeAndOpenFlyout}>
                {i18n.translate('xpack.monitoring.alerts.status.needToMigrate', {
                  defaultMessage: 'Migrate cluster alerts to our new alerting platform.',
                })}
              </EuiLink>
            </p>
          </EuiCallOut>
          {flyout}
        </Fragment>
      );
    }
  }

  const content = renderContent();
  if (content) {
    return (
      <Fragment>
        {content}
        <EuiSpacer />
      </Fragment>
    );
  }

  return null;
};
