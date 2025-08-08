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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getOptionLabel } from '../../../../../../../common/agent_configuration/all_option';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import {
  filterByAgent,
  settingDefinitions,
  validateSetting,
} from '../../../../../../../common/agent_configuration/setting_definitions';
import type { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import { useApmPluginContext } from '../../../../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import { saveConfig } from './save_config';
import { SettingFormRow } from './setting_form_row';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import type { ApmPluginStartDeps, ApmServices } from '../../../../../../plugin';
import type {
  AgentConfigurationChangedParams,
  ITelemetryClient,
} from '../../../../../../services/telemetry';

function removeEmpty(obj: { [key: string]: any }) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== ''));
}

export function reportTelemetry({
  telemetry,
  config,
  settingsDefinitions,
}: {
  telemetry: ITelemetryClient;
  config: AgentConfigurationIntake;
  settingsDefinitions: SettingDefinition[];
}) {
  const predefinedSettingsKeys = new Set();
  settingsDefinitions.forEach((setting) => {
    predefinedSettingsKeys.add(setting.key);
  });
  const predefinedSettings: AgentConfigurationChangedParams['predefinedSettings'] = [];
  const advancedSettings: AgentConfigurationChangedParams['advancedSettings'] = [];
  Object.entries(config.settings).forEach(([key, value]) => {
    if (predefinedSettingsKeys.has(key)) {
      predefinedSettings.push({ key, value });
    } else {
      advancedSettings.push({ key, value });
    }
  });
  telemetry.reportAgentConfigurationChanged({
    agentName: config.agent_name || 'all',
    environment: config.service.environment || 'all',
    predefinedSettings,
    advancedSettings,
  });
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
  const history = useHistory();
  // get a telemetry UI event tracker
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { telemetry } = services;

  const unsavedChangesCount = Object.keys(unsavedChanges).length;
  const isLoading = status === FETCH_STATUS.LOADING;

  const settingsDefinitionsByAgent = useMemo(() => {
    return settingDefinitions.filter(filterByAgent(newConfig.agent_name as AgentName));
  }, [newConfig.agent_name]);

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
    reportTelemetry({ telemetry, config, settingsDefinitions: settingsDefinitionsByAgent });
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
            renderSettings({ unsavedChanges, newConfig, setNewConfig, settingsDefinitionsByAgent })
          )}
        </form>
      </EuiForm>
      <EuiSpacer size="xxl" />

      {/* Bottom bar with save button */}
      {unsavedChangesCount > 0 && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={resetSettings}
          onSave={handleSubmitEvent}
          saveLabel={i18n.translate('xpack.apm.agentConfig.settingsPage.saveButton', {
            defaultMessage: 'Save configuration',
          })}
          unsavedChangesCount={unsavedChangesCount}
          appTestSubj="apm"
        />
      )}
    </>
  );
}

function renderSettings({
  newConfig,
  unsavedChanges,
  setNewConfig,
  settingsDefinitionsByAgent,
}: {
  newConfig: AgentConfigurationIntake;
  unsavedChanges: Record<string, string>;
  settingsDefinitionsByAgent: SettingDefinition[];
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
}) {
  return settingsDefinitionsByAgent.map((setting) => (
    <SettingFormRow
      isUnsaved={Object.hasOwn(unsavedChanges, setting.key)}
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
  ));
}
