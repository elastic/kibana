/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Router } from 'react-router-dom';
import {
  RedirectAppLinks,
  toMountPoint,
} from '../../../../../../src/plugins/kibana_react/public';
import { AlertsContextProvider } from '../../../../triggers_actions_ui/public';
import { getAlertingCapabilities } from '../../components/alerting/get_alert_capabilities';
import { getAPMHref } from '../../components/shared/Links/apm/APMLink';
import {
  ApmPluginContextValue,
  ApmPluginContext,
} from '../../context/ApmPluginContext';
import { LicenseProvider } from '../../context/LicenseContext';
import { ServiceNameContext } from '../../context/service_name_context';
import { UrlParamsProvider } from '../../context/UrlParamsContext';
import { useApmPluginContext } from '../../hooks/useApmPluginContext';
import { useServiceName } from '../../hooks/use_service_name';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { AnomalyDetectionSetupLink } from './anomaly_detection_setup_link';

export function ActionMenu() {
  const { core, plugins } = useApmPluginContext();
  const serviceName = useServiceName();
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
          canSaveAlerts={canSaveAlerts}
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

/**
 * Get the mount point to set the header menu with the header links.
 *
 * Alerts and ML links require a lot of context so include what we need here.
 */
export function getActionMenuMountPoint(
  apmPluginContextValue: ApmPluginContextValue,
  serviceName?: string
) {
  const { appMountParameters, core, plugins } = apmPluginContextValue;

  return toMountPoint(
    <Router history={appMountParameters.history}>
      <RedirectAppLinks application={core.application}>
        <ApmPluginContext.Provider value={apmPluginContextValue}>
          <UrlParamsProvider>
            <LicenseProvider>
              <ServiceNameContext.Provider value={serviceName}>
                <AlertsContextProvider
                  value={{
                    actionTypeRegistry:
                      plugins.triggersActionsUi.actionTypeRegistry,
                    alertTypeRegistry:
                      plugins.triggersActionsUi.alertTypeRegistry,
                    capabilities: core.application.capabilities,
                    docLinks: core.docLinks,
                    http: core.http,
                    toastNotifications: core.notifications.toasts,
                  }}
                >
                  <ActionMenu />
                </AlertsContextProvider>
              </ServiceNameContext.Provider>
            </LicenseProvider>
          </UrlParamsProvider>
        </ApmPluginContext.Provider>
      </RedirectAppLinks>
    </Router>
  );
}
