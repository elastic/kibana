/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BottomBarActions, useUiTracker } from '@kbn/observability-shared-plugin/public';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { isEDOTAgentName, type AgentName } from '@kbn/elastic-agent-utils';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import { getOptionLabel } from '../../../../../../../common/agent_configuration/all_option';
import type {
  AgentConfiguration,
  AgentConfigurationIntake,
} from '../../../../../../../common/agent_configuration/configuration_types';
import {
  filterByAgent,
  settingDefinitions,
  validateSetting,
} from '../../../../../../../common/agent_configuration/setting_definitions';
import { useApmPluginContext } from '../../../../../../context/apm_plugin/use_apm_plugin_context';
import type { FetcherResult } from '../../../../../../hooks/use_fetcher';
import { FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import { saveConfig } from './save_config';
import { SettingFormRow } from './setting_form_row';
import { AdvancedConfiguration } from './advanced_configuration';

function removeEmpty(obj: { [key: string]: any }) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== ''));
}

export function SettingsPage({
  initialConfig,
  unsavedChanges,
  newConfig,
  setNewConfig,
  resetSettings,
  isEditMode,
  onClickEdit,
}: {
  initialConfig?: FetcherResult<AgentConfiguration>;
  unsavedChanges: Record<string, string>;
  newConfig: AgentConfigurationIntake;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  resetSettings: () => void;
  isEditMode: boolean;
  onClickEdit: () => void;
}) {
  const history = useHistory();
  // get a telemetry UI event tracker
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);
  const [removedConfigCount, setRemovedConfigCount] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set<string>());
  const unsavedChangesCount = Object.keys(unsavedChanges).length;
  const status = initialConfig?.status;
  const isLoading = status === FETCH_STATUS.LOADING;
  const isAdvancedConfigSupported =
    newConfig.agent_name && isEDOTAgentName(newConfig.agent_name as AgentName);
  const isAdvancedConfigInvalid = validationErrors.size > 0;

  const addValidationError = (key: string) => {
    setValidationErrors((prev) => {
      prev.add(key);
      return new Set(prev);
    });
  };

  const removeValidationError = (key: string) => {
    setValidationErrors((prev) => {
      prev.delete(key);
      return new Set(prev);
    });
  };

  const settingsDefinitionsByAgent = useMemo(
    () => settingDefinitions.filter(filterByAgent(newConfig.agent_name as AgentName)),
    [newConfig.agent_name]
  );

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

  const handleChange = (key: string, value: string, oldKey?: string) => {
    setNewConfig((prev) => {
      let updatedSettings: Record<string, string>;

      if (oldKey !== undefined) {
        // Handle key change

        // Maintain the order by recreating the config object while preserving key positions
        updatedSettings = Object.fromEntries(
          Object.entries(prev.settings).map(([currentKey, currentValue]) =>
            currentKey === oldKey ? [key, currentValue] : [currentKey, currentValue]
          )
        );
      } else if (key === '' && value === '' && prev.settings[''] === undefined) {
        // Handle new row at the top of the list
        updatedSettings = { ['']: '', ...prev.settings };
      } else {
        // Handle value change
        updatedSettings = { ...prev.settings, [key]: value };
      }

      return {
        ...prev,
        settings: updatedSettings,
      };
    });
  };

  const handleDelete = (key: string, id: number) => {
    // Detect removed config only when the key-value already existed before
    if (key in (initialConfig?.data?.settings ?? {})) {
      setRemovedConfigCount((prev) => prev + 1);
    }
    removeValidationError(`key${id}`);
    removeValidationError(`value${id}`);
    setNewConfig((prev) => {
      const { [key]: deleted, ...rest } = prev.settings;
      return {
        ...prev,
        settings: rest,
      };
    });
  };

  if (status === FETCH_STATUS.FAILURE) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.apm.agentConfig.settingsPage.notFound.title', {
          defaultMessage: 'Sorry, there was an error',
        })}
        color="danger"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.apm.agentConfig.settingsPage.notFound.message', {
            defaultMessage: 'The requested configuration does not exist',
          })}
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

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                titleSize="xs"
                title={
                  isLoading ? (
                    '-'
                  ) : (
                    <span data-test-subj="settingsPage_serviceName">
                      {getOptionLabel(newConfig.service.name)}
                    </span>
                  )
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
                  isLoading ? (
                    '-'
                  ) : (
                    <span data-test-subj="settingsPage_environmentName">
                      {getOptionLabel(newConfig.service.environment)}
                    </span>
                  )
                }
                description={i18n.translate(
                  'xpack.apm.agentConfig.chooseService.service.environment.label',
                  { defaultMessage: 'Environment' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {!isEditMode && (
                <EuiButton
                  data-test-subj="apmSettingsPageEditButton"
                  onClick={onClickEdit}
                  iconType="pencil"
                >
                  {i18n.translate('xpack.apm.agentConfig.chooseService.editButton', {
                    defaultMessage: 'Edit',
                  })}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule />

          {/* Settings panel */}

          {isLoading ? (
            <div style={{ textAlign: 'center' }}>
              <EuiLoadingSpinner size="m" />
            </div>
          ) : (
            <>
              {renderSettings({
                unsavedChanges,
                newConfig,
                settingsDefinitionsByAgent,
                onChange: handleChange,
              })}
              {isAdvancedConfigSupported && (
                <>
                  <EuiHorizontalRule />
                  <AdvancedConfiguration
                    newConfig={newConfig}
                    settingsDefinitions={settingsDefinitionsByAgent}
                    onChange={handleChange}
                    onDelete={handleDelete}
                    addValidationError={addValidationError}
                    removeValidationError={removeValidationError}
                  />
                </>
              )}
            </>
          )}
        </form>
      </EuiForm>
      <EuiSpacer size="xxl" />

      {/* Bottom bar with save button */}
      {(unsavedChangesCount > 0 || removedConfigCount > 0) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={() => {
            setRemovedConfigCount(0);
            resetSettings();
          }}
          onSave={handleSubmitEvent}
          saveLabel={i18n.translate('xpack.apm.agentConfig.settingsPage.saveButton', {
            defaultMessage: 'Save configuration',
          })}
          unsavedChangesCount={unsavedChangesCount + removedConfigCount}
          appTestSubj="apm"
          areChangesInvalid={isAdvancedConfigInvalid}
        />
      )}
    </>
  );
}

function renderSettings({
  newConfig,
  unsavedChanges,
  settingsDefinitionsByAgent,
  onChange,
}: {
  newConfig: AgentConfigurationIntake;
  unsavedChanges: Record<string, string>;
  settingsDefinitionsByAgent: SettingDefinition[];
  onChange: (key: string, value: string) => void;
}) {
  return settingsDefinitionsByAgent.map((setting) => (
    <SettingFormRow
      isUnsaved={Object.hasOwn(unsavedChanges, setting.key)}
      key={setting.key}
      setting={setting}
      value={newConfig.settings[setting.key]}
      onChange={onChange}
    />
  ));
}
