/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';

export function AdvancedConfiguration({
  newConfig,
  settingsDefinitionsByAgent,
  setNewConfig,
  setRemovedSettingsCount,
  setInvalidChanges,
}: {
  newConfig: AgentConfigurationIntake;
  settingsDefinitionsByAgent: SettingDefinition[];
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  setRemovedSettingsCount: React.Dispatch<React.SetStateAction<number>>;
  setInvalidChanges: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const agentSettingKeys = useMemo(
    () => settingsDefinitionsByAgent.map((setting) => setting.key),
    [settingsDefinitionsByAgent]
  );

  const unknownAgentSettings = useMemo(() => {
    return Object.entries(newConfig.settings).filter(([key]) => !agentSettingKeys.includes(key));
  }, [agentSettingKeys, newConfig.settings]);

  const updateValue = (key: string, value: string) => {
    setNewConfig((prev) => {
      return {
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value,
        },
      };
    });
  };

  const updateKey = (oldKey: string, newKey: string, value: string) => {
    setNewConfig((prev) => {
      // Maintain the order by recreating the settings object while preserving key positions
      const newSettings: Record<string, string> = {};

      Object.entries(prev.settings).forEach(([key, val]) => {
        if (key === oldKey) {
          // Replace the old key with the new key at the same position
          newSettings[newKey] = value;
        } else {
          // Keep other keys in their original positions
          newSettings[key] = val;
        }
      });

      return {
        ...prev,
        settings: newSettings,
      };
    });
  };

  const addNewRow = () => {
    setNewConfig((prev) => {
      return {
        ...prev,
        settings: {
          ['']: '',
          ...prev.settings,
        },
      };
    });
  };

  const deleteRow = (key: string) => {
    if (newConfig.settings[key]) {
      setRemovedSettingsCount((prev) => prev + 1);
    }
    setNewConfig((prev) => {
      const { [key]: deleted, ...rest } = prev.settings;
      return {
        ...prev,
        settings: rest,
      };
    });
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.apm.agentConfig.settingsPage.advancedConfigurationTitle"
                defaultMessage="Advanced Configuration"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m">
            <p>
              <FormattedMessage
                id="xpack.apm.agentConfig.settingsPage.advancedConfigurationDescription"
                defaultMessage="Advanced configuration allows you to define custom settings that are not covered by the standard predefined options above. These settings are passed directly to your EDOT collector. Use with caution as incorrect configuration may affect your collector's behavior."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <div>
            <EuiButton
              data-test-subj="apmSettingsAddAdvancedConfigurationButton"
              iconType="plusInCircle"
              onClick={addNewRow}
            >
              {i18n.translate('xpack.apm.settingsPage.addAdvancedConfigurationButton', {
                defaultMessage: 'Add configuration',
              })}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {unknownAgentSettings.map(([settingKey, settingValue], index) => (
        <Fragment key={index}>
          {index > 0 && <EuiSpacer size="s" />}
          <EuiFlexGroup>
            <EuiFlexItem>
              <AdvancedConfigKeyInput
                settingKey={settingKey}
                settingValue={settingValue}
                index={index}
                agentSettingKeys={agentSettingKeys}
                unknownAgentSettings={unknownAgentSettings}
                setInvalidChanges={setInvalidChanges}
                onUpdate={updateKey}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <AdvancedConfigValueInput
                settingValue={settingValue}
                settingKey={settingKey}
                index={index}
                setInvalidChanges={setInvalidChanges}
                onUpdate={updateValue}
                onDelete={deleteRow}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ))}
      <EuiSpacer size="m" />
    </>
  );
}

function AdvancedConfigKeyInput({
  settingKey,
  settingValue,
  index,
  agentSettingKeys,
  unknownAgentSettings,
  setInvalidChanges,
  onUpdate,
}: {
  settingKey: string;
  settingValue: string;
  index: number;
  agentSettingKeys: string[];
  unknownAgentSettings: Array<[string, string]>;
  setInvalidChanges: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdate: (oldKey: string, newKey: string, value: string) => void;
}) {
  // Handle key inputs with local state to avoid duplicated keys overwriting each other
  const [localKey, setLocalKey] = useState(settingKey);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocalKey(settingKey);
  }, [settingKey]);

  const checkIfAdvancedConfigKeyExists = useCallback(
    (key: string) => {
      return unknownAgentSettings.some(
        ([unknownConfigKey], unknownConfigIndex) =>
          unknownConfigKey === key && unknownConfigIndex !== index
      );
    },
    [unknownAgentSettings, index]
  );

  const isInvalidInput = (key: string) => {
    return key === '' || agentSettingKeys.includes(key) || checkIfAdvancedConfigKeyExists(key);
  };

  const getKeyValidationError = (key: string) => {
    if (key === '') {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyEmptyError', {
        defaultMessage: 'Key cannot be empty',
      });
    }
    if (agentSettingKeys.includes(key)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyPredefinedError', {
        defaultMessage: 'This key is already predefined in the standard configuration above',
      });
    }
    if (checkIfAdvancedConfigKeyExists(key)) {
      return i18n.translate('xpack.apm.agentConfig.settingsPage.keyDuplicateError', {
        defaultMessage: 'This key is already used in another advanced configuration',
      });
    }
    return null;
  };

  const handleKeyChange = (newKey: string) => {
    setTouched(true);
    setLocalKey(newKey);
    setInvalidChanges(isInvalidInput(newKey));
    // Skip updating if key already exists to prevent overwriting existing values,
    // which would lead to data loss and poor user experience
    if (!checkIfAdvancedConfigKeyExists(newKey)) {
      onUpdate(settingKey, newKey, settingValue);
    }
  };

  return (
    <EuiFormRow
      label={
        index === 0
          ? i18n.translate('xpack.apm.agentConfig.settingsPage.keyLabel', {
              defaultMessage: 'key',
            })
          : undefined
      }
      error={getKeyValidationError(localKey)}
      isInvalid={touched && isInvalidInput(localKey)}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="apmSettingsAdvancedConfigurationKeyField"
        aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.keyAriaLabel', {
          defaultMessage: 'Advanced configuration key',
        })}
        fullWidth
        value={localKey}
        isInvalid={touched && isInvalidInput(localKey)}
        onChange={(e) => handleKeyChange(e.target.value)}
      />
    </EuiFormRow>
  );
}

function AdvancedConfigValueInput({
  settingValue,
  settingKey,
  index,
  setInvalidChanges,
  onUpdate,
  onDelete,
}: {
  settingValue: string;
  settingKey: string;
  index: number;
  setInvalidChanges: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdate: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}) {
  const [touched, setTouched] = useState(false);

  const isInvalidInput = (value: string) => {
    return value === '';
  };

  const handleValueChange = (value: string) => {
    setTouched(true);
    onUpdate(settingKey, value);
    setInvalidChanges(isInvalidInput(value));
  };

  return (
    <EuiFormRow
      label={
        index === 0
          ? i18n.translate('xpack.apm.agentConfig.settingsPage.valueLabel', {
              defaultMessage: 'value',
            })
          : undefined
      }
      error={i18n.translate('xpack.apm.agentConfig.settingsPage.valueEmptyError', {
        defaultMessage: 'Value cannot be empty',
      })}
      isInvalid={touched && isInvalidInput(settingValue)}
      fullWidth
    >
      <EuiFieldText
        isInvalid={touched && isInvalidInput(settingValue)}
        data-test-subj="apmSettingsAdvancedConfigurationValueField"
        aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.valueAriaLabel', {
          defaultMessage: 'Advanced configuration value',
        })}
        fullWidth
        value={settingValue}
        onChange={(e) => handleValueChange(e.target.value)}
        append={
          <EuiButtonIcon
            data-test-subj="apmSettingsRemoveAdvancedConfigurationButton"
            aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.removeButtonAriaLabel', {
              defaultMessage: 'Remove advanced configuration',
            })}
            iconType="trash"
            color={'danger'}
            onClick={() => onDelete(settingKey)}
          />
        }
      />
    </EuiFormRow>
  );
}
