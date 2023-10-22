/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPerCoreWatt,
} from '@kbn/observability-plugin/common';
import { useEditableSettings, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { isEmpty } from 'lodash';
import React from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { BottomBarActions } from './bottom_bar_actions';

const settingKeys = [profilingCo2PerKWH, profilingDatacenterPUE, profilingPerCoreWatt];

export function Settings() {
  const trackProfilingEvent = useUiTracker({ app: 'profiling' });
  const {
    start: {
      core: { docLinks, notifications },
    },
  } = useProfilingDependencies();

  const {
    handleFieldChange,
    settingsEditableConfig,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useEditableSettings('profiling', settingKeys);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return settingsEditableConfig[key].requiresPageReload;
      });
      await saveAll();
      trackProfilingEvent({ metric: 'general_settings_save' });
      if (reloadPage) {
        window.location.reload();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.profiling.settings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  return (
    <ProfilingAppPageTemplate hideSearchBar>
      <>
        <EuiTitle>
          <EuiText>
            {i18n.translate('xpack.profiling.settings.title', {
              defaultMessage: 'Advanced Settings',
            })}
          </EuiText>
        </EuiTitle>
        <EuiSpacer />
        <EuiPanel grow={false} hasShadow={false} hasBorder paddingSize="none">
          <EuiPanel color="subdued" hasShadow={false}>
            <EuiTitle size="s">
              <EuiText>
                {i18n.translate('xpack.profiling.settings.co2Sections', {
                  defaultMessage: 'CO2',
                })}
              </EuiText>
            </EuiTitle>
          </EuiPanel>
          <EuiPanel hasShadow={false}>
            {settingKeys.map((settingKey) => {
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
          </EuiPanel>
        </EuiPanel>
        {!isEmpty(unsavedChanges) && (
          <BottomBarActions
            isLoading={isSaving}
            onDiscardChanges={cleanUnsavedChanges}
            onSave={handleSave}
            saveLabel={i18n.translate('xpack.profiling.settings.saveButton', {
              defaultMessage: 'Save changes',
            })}
            unsavedChangesCount={Object.keys(unsavedChanges).length}
          />
        )}
      </>
    </ProfilingAppPageTemplate>
  );
}
