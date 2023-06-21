/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { apmLabsButton } from '@kbn/observability-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { getLegacyApmHref } from '../../../shared/links/apm/apm_link';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { AnomalyDetectionSetupLink } from './anomaly_detection_setup_link';
import { InspectorHeaderLink } from './inspector_header_link';
import { Labs } from './labs';

export function ApmHeaderActionMenu() {
  const { core, plugins } = useApmPluginContext();
  const { search } = window.location;
  const { application, http } = core;
  const { basePath } = http;
  const { capabilities } = application;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const canCreateMlJobs = !!capabilities.ml?.canCreateJob;
  const { isAlertingAvailable, canReadAlerts, canSaveAlerts } =
    getAlertingCapabilities(plugins, capabilities);
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
      {canCreateMlJobs && <AnomalyDetectionSetupLink />}
      {isAlertingAvailable && (
        <AlertingPopoverAndFlyout
          canReadAlerts={canReadAlerts}
          canSaveAlerts={canSaveApmAlerts}
          canReadMlJobs={canReadMlJobs}
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
