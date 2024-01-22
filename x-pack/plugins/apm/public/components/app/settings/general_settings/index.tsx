/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
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
} from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React from 'react';
import {
  useEditableSettings,
  useUiTracker,
} from '@kbn/observability-shared-plugin/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { BottomBarActions } from '../bottom_bar_actions';

const apmSettingsKeys = [
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
  apmEnableProfilingIntegration,
];

export function GeneralSettings() {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { docLinks, notifications } = useApmPluginContext().core;
  const {
    handleFieldChange,
    settingsEditableConfig,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useEditableSettings('apm', apmSettingsKeys);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return settingsEditableConfig[key].requiresPageReload;
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

  return (
    <>
      <EuiSpacer />
      {apmSettingsKeys.map((settingKey) => {
        const editableConfig = settingsEditableConfig[settingKey];
        return (
          <LazyField
            key={settingKey}
            setting={editableConfig}
            handleChange={handleFieldChange}
            enableSaving
            docLinks={docLinks.links}
            toasts={notifications.toasts}
            unsavedChanges={unsavedChanges[settingKey]}
          />
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
        />
      )}
    </>
  );
}
