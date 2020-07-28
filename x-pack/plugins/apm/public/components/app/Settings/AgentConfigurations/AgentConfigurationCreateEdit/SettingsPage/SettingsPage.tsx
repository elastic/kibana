/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiForm,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiBottomBar,
  EuiText,
  EuiHealth,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { FETCH_STATUS } from '../../../../../../hooks/useFetcher';
import { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import { history } from '../../../../../../utils/history';
import { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import {
  filterByAgent,
  settingDefinitions,
  validateSetting,
} from '../../../../../../../common/agent_configuration/setting_definitions';
import { saveConfig } from './saveConfig';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { useUiTracker } from '../../../../../../../../observability/public';
import { SettingFormRow } from './SettingFormRow';
import { getOptionLabel } from '../../../../../../../common/agent_configuration/all_option';

function removeEmpty(obj: { [key: string]: any }) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
}

export function SettingsPage({
  status,
  unsavedChanges,
  newConfig,
  setNewConfig,
  resetSettings,
  isEditMode,
  onClickEdit,
}: {
  status?: FETCH_STATUS;
  unsavedChanges: Record<string, string>;
  newConfig: AgentConfigurationIntake;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  resetSettings: () => void;
  isEditMode: boolean;
  onClickEdit: () => void;
}) {
  // get a telemetry UI event tracker
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);
  const unsavedChangesCount = Object.keys(unsavedChanges).length;
  const isLoading = status === FETCH_STATUS.LOADING;

  const isFormValid = useMemo(() => {
    return (
      settingDefinitions
        // only validate settings that are not empty
        .filter(({ key }) => {
          const value = newConfig.settings[key];
          return value != null && value !== '';
        })

        // every setting must be valid for the form to be valid
        .every((def) => {
          const value = newConfig.settings[def.key];
          return validateSetting(def, value).isValid;
        })
    );
  }, [newConfig.settings]);

  const handleSubmitEvent = async () => {
    trackApmEvent({ metric: 'save_agent_configuration' });
    const config = { ...newConfig, settings: removeEmpty(newConfig.settings) };

    setIsSaving(true);
    await saveConfig({ config, isEditMode, toasts });
    setIsSaving(false);

    // go back to overview
    history.push({
      pathname: '/settings/agent-configuration',
      search: history.location.search,
    });
  };

  if (status === FETCH_STATUS.FAILURE) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.agentConfig.settingsPage.notFound.title',
          { defaultMessage: 'Sorry, there was an error' }
        )}
        color="danger"
        iconType="alert"
      >
        <p>
          {i18n.translate(
            'xpack.apm.agentConfig.settingsPage.notFound.message',
            { defaultMessage: 'The requested configuration does not exist' }
          )}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiForm>
        {/* Since the submit button is placed outside the form we cannot use `onSubmit` and have to use `onKeyPress` to submit the form on enter */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <form
          onKeyPress={(e) => {
            const didClickEnter = e.which === 13;
            if (didClickEnter && isFormValid) {
              e.preventDefault();
              handleSubmitEvent();
            }
          }}
        >
          {/* Selected Service panel */}
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.apm.agentConfig.chooseService.title', {
                  defaultMessage: 'Choose service',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiStat
                  titleSize="xs"
                  title={
                    isLoading ? '-' : getOptionLabel(newConfig.service.name)
                  }
                  description={i18n.translate(
                    'xpack.apm.agentConfig.chooseService.service.name.label',
                    { defaultMessage: 'Service name' }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  titleSize="xs"
                  title={
                    isLoading
                      ? '-'
                      : getOptionLabel(newConfig.service.environment)
                  }
                  description={i18n.translate(
                    'xpack.apm.agentConfig.chooseService.service.environment.label',
                    { defaultMessage: 'Environment' }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {!isEditMode && (
                  <EuiButton onClick={onClickEdit} iconType="pencil">
                    {i18n.translate(
                      'xpack.apm.agentConfig.chooseService.editButton',
                      { defaultMessage: 'Edit' }
                    )}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Settings panel */}
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.apm.agentConfig.settings.title', {
                  defaultMessage: 'Configuration options',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="m" />

            {isLoading ? (
              <div style={{ textAlign: 'center' }}>
                <EuiLoadingSpinner size="m" />
              </div>
            ) : (
              renderSettings({ unsavedChanges, newConfig, setNewConfig })
            )}
          </EuiPanel>
        </form>
      </EuiForm>
      <EuiSpacer size="xxl" />

      {/* Bottom bar with save button */}
      {unsavedChangesCount > 0 && (
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
                {i18n.translate('xpack.apm.unsavedChanges', {
                  defaultMessage:
                    '{unsavedChangesCount, plural, =0{0 unsaved changes} one {1 unsaved change} other {# unsaved changes}} ',
                  values: { unsavedChangesCount },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="ghost" onClick={resetSettings}>
                    {i18n.translate(
                      'xpack.apm.agentConfig.settingsPage.discardChangesButton',
                      { defaultMessage: 'Discard changes' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handleSubmitEvent}
                    fill
                    isLoading={isSaving}
                    isDisabled={!isFormValid}
                    color="secondary"
                    iconType="check"
                  >
                    {i18n.translate(
                      'xpack.apm.agentConfig.settingsPage.saveButton',
                      { defaultMessage: 'Save configuration' }
                    )}
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

function renderSettings({
  newConfig,
  unsavedChanges,
  setNewConfig,
}: {
  newConfig: AgentConfigurationIntake;
  unsavedChanges: Record<string, string>;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
}) {
  return (
    settingDefinitions

      // filter out agent specific items that are not applicable
      // to the selected service
      .filter(filterByAgent(newConfig.agent_name as AgentName))
      .map((setting) => (
        <SettingFormRow
          isUnsaved={unsavedChanges.hasOwnProperty(setting.key)}
          key={setting.key}
          setting={setting}
          value={newConfig.settings[setting.key]}
          onChange={(key, value) => {
            setNewConfig((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                [key]: value,
              },
            }));
          }}
        />
      ))
  );
}
