/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiHeaderLinks, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { getLegacyApmHref } from '../../../shared/links/apm/apm_link_hooks';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';
import { InspectorHeaderLink } from './inspector_header_link';
import { AddDataContextMenu } from './add_data_context_menu';
import { useEntityCentricExperienceSetting } from '../../../../hooks/use_entity_centric_experience_setting';

export function ApmHeaderActionMenu() {
  const { core, plugins, config } = useApmPluginContext();
  const { search } = window.location;
  const { application, http } = core;
  const { basePath } = http;
  const { capabilities } = application;
  const { featureFlags } = config;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canReadAlerts, canSaveAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );
  const canSaveApmAlerts = capabilities.apm.save && canSaveAlerts;
  const { isEntityCentricExperienceEnabled } = useEntityCentricExperienceSetting();

  function apmHref(path: string) {
    return getLegacyApmHref({ basePath, path, search });
  }

  function kibanaHref(path: string) {
    return basePath.prepend(path);
  }

  return (
    <EuiHeaderLinks gutterSize="xs">
      {featureFlags.storageExplorerAvailable && (
        <EuiHeaderLink
          color="primary"
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
      )}

      {isAlertingAvailable && (
        <AlertingPopoverAndFlyout
          canReadAlerts={canReadAlerts}
          canSaveAlerts={canSaveApmAlerts}
          canReadMlJobs={canReadMlJobs}
        />
      )}

      <EuiHeaderLink
        color="primary"
        href={apmHref('/settings')}
        data-test-subj="apmSettingsHeaderLink"
      >
        {i18n.translate('xpack.apm.settingsLinkLabel', {
          defaultMessage: 'Settings',
        })}
      </EuiHeaderLink>
      <InspectorHeaderLink />
      {isEntityCentricExperienceEnabled ? (
        <AddDataContextMenu />
      ) : (
        <EuiHeaderLink
          color="primary"
          href={kibanaHref('/app/apm/tutorial')}
          data-test-subj="apmAddDataHeaderLink"
        >
          {i18n.translate('xpack.apm.addDataButtonLabel', {
            defaultMessage: 'Add data',
          })}
        </EuiHeaderLink>
      )}
    </EuiHeaderLinks>
  );
}
