/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { getAlertingCapabilities } from '../../components/alerting/get_alert_capabilities';
import { getAPMHref } from '../../components/shared/Links/apm/APMLink';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { AnomalyDetectionSetupLink } from './anomaly_detection_setup_link';

export function ActionMenu() {
  const { core, plugins } = useApmPluginContext();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { search } = window.location;
  const { application, http } = core;
  const { basePath } = http;
  const { capabilities } = application;
  const canAccessML = !!capabilities.ml?.canAccessML;
  const {
    isAlertingAvailable,
    canReadAlerts,
    canSaveAlerts,
    canReadAnomalies,
  } = getAlertingCapabilities(plugins, capabilities);
  const canSaveApmAlerts = capabilities.apm.save && canSaveAlerts;

  function apmHref(path: string) {
    return getAPMHref({ basePath, path, search });
  }

  function kibanaHref(path: string) {
    return basePath.prepend(path);
  }

  return (
    <EuiHeaderLinks>
      <EuiHeaderLink
        color="primary"
        href={apmHref('/settings')}
        iconType="gear"
      >
        {i18n.translate('xpack.apm.settingsLinkLabel', {
          defaultMessage: 'Settings',
        })}
      </EuiHeaderLink>
      {isAlertingAvailable && (
        <AlertingPopoverAndFlyout
          basePath={basePath}
          canReadAlerts={canReadAlerts}
          canSaveAlerts={canSaveApmAlerts}
          canReadAnomalies={canReadAnomalies}
          includeTransactionDuration={serviceName !== undefined}
        />
      )}
      {canAccessML && <AnomalyDetectionSetupLink />}
      <EuiHeaderLink
        color="primary"
        href={kibanaHref('/app/home#/tutorial/apm')}
        iconType="indexOpen"
      >
        {i18n.translate('xpack.apm.addDataButtonLabel', {
          defaultMessage: 'Add data',
        })}
      </EuiHeaderLink>
    </EuiHeaderLinks>
  );
}
