/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CoreStart } from '../../../../../../src/core/public';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public';
import { AlertsContextProvider } from '../../../../triggers_actions_ui/public';
import { ApmPluginSetupDeps } from '../../plugin';
import { getAlertingCapabilities } from '../alerting/get_alert_capabilities';
import { AlertingPopoverAndFlyout } from '../app/Home/alerting_popover_flyout';
import { getAPMHref } from './Links/apm/APMLink';

interface HeaderLinksProps {
  core: CoreStart;
  plugins: ApmPluginSetupDeps;
}

export function HeaderLinks({ core, plugins }: HeaderLinksProps) {
  const { search } = window.location;
  const { application, http } = core;
  const { basePath } = http;

  const {
    isAlertingAvailable,
    canReadAlerts,
    canSaveAlerts,
    canReadAnomalies,
  } = getAlertingCapabilities(plugins, core.application.capabilities);

  function apmHref(path: string) {
    return getAPMHref({ basePath, path, search });
  }

  function kibanaHref(path: string) {
    return basePath.prepend(path);
  }

  return (
    <RedirectAppLinks application={application}>
      <AlertsContextProvider
        value={{
          http,
          docLinks: core.docLinks,
          capabilities: core.application.capabilities,
          toastNotifications: core.notifications.toasts,
          actionTypeRegistry: plugins.triggersActionsUi.actionTypeRegistry,
          alertTypeRegistry: plugins.triggersActionsUi.alertTypeRegistry,
        }}
      >
        <EuiHeaderLinks>
          {isAlertingAvailable && (
            <AlertingPopoverAndFlyout
              basePath={basePath}
              canReadAlerts={canReadAlerts}
              canSaveAlerts={canSaveAlerts}
              canReadAnomalies={canReadAnomalies}
            />
          )}
          <EuiHeaderLink
            color="primary"
            href={apmHref('/settings')}
            iconType="gear"
          >
            {i18n.translate('xpack.apm.settingsLinkLabel', {
              defaultMessage: 'Settings',
            })}
          </EuiHeaderLink>
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
      </AlertsContextProvider>
    </RedirectAppLinks>
  );
}
