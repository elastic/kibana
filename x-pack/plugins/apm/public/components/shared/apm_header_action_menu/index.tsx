/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getAlertingCapabilities } from '../../alerting/get_alerting_capabilities';
import { getLegacyApmHref } from '../links/apm/apm_link';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { AnomalyDetectionSetupLink } from './anomaly_detection_setup_link';
import { useServiceName } from '../../../hooks/use_service_name';
import { InspectorHeaderLink } from './inspector_header_link';

export function ApmHeaderActionMenu() {
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
  const canSaveApmAlerts = capabilities.apm.save && canSaveAlerts;

  function apmHref(path: string) {
    return getLegacyApmHref({ basePath, path, search });
  }

  function kibanaHref(path: string) {
    return basePath.prepend(path);
  }

  return (
    <EuiHeaderLinks gutterSize="xs">
      <EuiHeaderLink color="text" href={apmHref('/settings')}>
        {i18n.translate('xpack.apm.settingsLinkLabel', {
          defaultMessage: 'Settings',
        })}
      </EuiHeaderLink>
      {canAccessML && <AnomalyDetectionSetupLink />}
      {isAlertingAvailable && (
        <AlertingPopoverAndFlyout
          basePath={basePath}
          canReadAlerts={canReadAlerts}
          canSaveAlerts={canSaveApmAlerts}
          canReadAnomalies={canReadAnomalies}
          includeTransactionDuration={serviceName !== undefined}
        />
      )}
      <EuiHeaderLink
        color="primary"
        href={kibanaHref('/app/home#/tutorial/apm')}
        iconType="indexOpen"
      >
        {i18n.translate('xpack.apm.addDataButtonLabel', {
          defaultMessage: 'Add data',
        })}
      </EuiHeaderLink>
      <InspectorHeaderLink />
    </EuiHeaderLinks>
  );
}
