/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import { i18n } from '@kbn/i18n';
import {
  apmLabsButton,
  apmServiceGroupMaxNumberOfServices,
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
  enableInspectEsQueries,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
  apmEnableServiceMetrics,
  apmEnableContinuousRollups,
  enableAgentExplorerView,
  apmEnableProfilingIntegration,
  apmEnableTableSearchBar,
  apmEnableTransactionProfiling,
  apmEnableServiceInventoryTableSearchBar,
} from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React from 'react';
import {
  BottomBarActions,
  useEditableSettings,
  useUiTracker,
} from '@kbn/observability-shared-plugin/public';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { useApmFeatureFlag } from '../../../../hooks/use_apm_feature_flag';
import { ApmFeatureFlagName } from '../../../../../common/apm_feature_flags';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row'))
    .FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

function getApmSettingsKeys(isProfilingIntegrationEnabled: boolean) {
  const keys = [
    enableComparisonByDefault,
    defaultApmServiceEnvironment,
    apmServiceGroupMaxNumberOfServices,
    enableInspectEsQueries,
    apmLabsButton,
    apmAWSLambdaPriceFactor,
    apmAWSLambdaRequestCostPerMillion,
    apmEnableServiceMetrics,
    apmEnableContinuousRollups,
    enableAgentExplorerView,
    apmEnableTableSearchBar,
    apmEnableServiceInventoryTableSearchBar,
  ];

  if (isProfilingIntegrationEnabled) {
    keys.push(
      ...[apmEnableProfilingIntegration, apmEnableTransactionProfiling]
    );
  }

  return keys;
}

export function GeneralSettings() {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { docLinks, notifications, settings } = useApmPluginContext().core;
  const isProfilingIntegrationEnabled = useApmFeatureFlag(
    ApmFeatureFlagName.ProfilingIntegrationAvailable
  );
  const apmSettingsKeys = getApmSettingsKeys(isProfilingIntegrationEnabled);
  const {
    fields,
    handleFieldChange,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useEditableSettings(apmSettingsKeys);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return fields[key].requiresPageReload;
      });
      await saveAll();
      trackApmEvent({ metric: 'general_settings_save' });
      if (reloadPage) {
        window.location.reload();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.apmSettings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  const hasInvalidChanges = Object.values(unsavedChanges).some(
    ({ isInvalid }) => isInvalid
  );

  return (
    <>
      <EuiSpacer />
      {apmSettingsKeys.map((settingKey) => {
        const field = fields[settingKey];
        return (
          <FieldRowProvider
            {...{
              links: docLinks.links.management,
              showDanger: (message: string) =>
                notifications.toasts.addDanger(message),
              validateChange: (key: string, value: any) =>
                settings.client.validateValue(key, value),
            }}
          >
            <FieldRow
              field={field}
              isSavingEnabled={true}
              onFieldChange={handleFieldChange}
              unsavedChange={unsavedChanges[settingKey]}
            />
          </FieldRowProvider>
        );
      })}
      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={cleanUnsavedChanges}
          onSave={handleSave}
          saveLabel={i18n.translate('xpack.apm.apmSettings.saveButton', {
            defaultMessage: 'Save changes',
          })}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
          appTestSubj="apm"
          areChangesInvalid={hasInvalidChanges}
        />
      )}
    </>
  );
}
