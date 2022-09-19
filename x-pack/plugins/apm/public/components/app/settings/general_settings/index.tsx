/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apmLabsButton,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
  enableInspectEsQueries,
} from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmEditableSettings } from '../../../../hooks/use_apm_editable_settings';

const apmSettingsKeys = [
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  enableInspectEsQueries,
  apmLabsButton,
];

export function GeneralSettings() {
  const { docLinks, notifications } = useApmPluginContext().core;
  const {
    handleFieldChange,
    settingsEditableConfig,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useApmEditableSettings(apmSettingsKeys);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return settingsEditableConfig[key].requiresPageReload;
      });
      await saveAll();
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
        <EuiBottomBar paddingSize="s">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem
              grow={false}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <EuiHealth color="warning" />
              <EuiText color="ghost">
                {i18n.translate('xpack.apm.apmSettings.unsavedChanges', {
                  defaultMessage:
                    '{unsavedChangesCount, plural, =0{0 unsaved changes} one {1 unsaved change} other {# unsaved changes}} ',
                  values: {
                    unsavedChangesCount: Object.keys(unsavedChanges).length,
                  },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="ghost" onClick={cleanUnsavedChanges}>
                    {i18n.translate(
                      'xpack.apm.apmSettings.discardChangesButton',
                      { defaultMessage: 'Discard changes' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handleSave}
                    fill
                    isLoading={isSaving}
                    color="success"
                    iconType="check"
                  >
                    {i18n.translate('xpack.apm.apmSettings.saveButton', {
                      defaultMessage: 'Save changes',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
}
