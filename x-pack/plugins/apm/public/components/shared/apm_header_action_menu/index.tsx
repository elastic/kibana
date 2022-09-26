/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLinks,
} from '@elastic/eui';
import { apmLabsButton } from '@kbn/observability-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getAlertingCapabilities } from '../../alerting/get_alerting_capabilities';
import { getLegacyApmHref } from '../links/apm/apm_link';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { AnomalyDetectionSetupLink } from './anomaly_detection_setup_link';
import { useServiceName } from '../../../hooks/use_service_name';
import { InspectorHeaderLink } from './inspector_header_link';
import { Labs } from './labs';

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

  const isLabsButtonEnabled = core.uiSettings.get<boolean>(
    apmLabsButton,
    false
  );

  return (
    <EuiHeaderLinks gutterSize="xs">
      {isLabsButtonEnabled && <Labs />}
      <EuiHeaderLink
        color="text"
        href={apmHref('/storage-explorer')}
        data-test-subj="apmStorageExplorerHeaderLink"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.apm.storageExplorerLinkLabel', {
              defaultMessage: 'Storage Explorer',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
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
        data-test-subj="apmAddDataHeaderLink"
      >
        {i18n.translate('xpack.apm.addDataButtonLabel', {
          defaultMessage: 'Add data',
        })}
      </EuiHeaderLink>

      <EuiHeaderLink
        color="text"
        href={apmHref('/settings')}
        data-test-subj="apmSettingsHeaderLink"
      >
        {i18n.translate('xpack.apm.settingsLinkLabel', {
          defaultMessage: 'Settings',
        })}
      </EuiHeaderLink>
      <InspectorHeaderLink />
    </EuiHeaderLinks>
  );
}
