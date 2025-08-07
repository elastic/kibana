/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import { AdvancedConfigKeyInput } from './advanced_config_key_input';
import { AdvancedConfigValueInput } from './advanced_config_value_input';

export function AdvancedConfiguration({
  newConfig,
  settingsDefinitionsByAgent,
  setNewConfig,
  setRemovedConfigCount,
  setValidationErrors,
}: {
  newConfig: AgentConfigurationIntake;
  settingsDefinitionsByAgent: SettingDefinition[];
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  setRemovedConfigCount: React.Dispatch<React.SetStateAction<number>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const agentLanguage = newConfig.agent_name?.split('/')[1] || '';
  const predefinedAgentConfigKeys = useMemo(
    () => settingsDefinitionsByAgent.map((setting) => setting.key),
    [settingsDefinitionsByAgent]
  );

  const unknownAgentConfigs = useMemo(() => {
    return new Map(
      Object.entries(newConfig.settings).filter(([key]) => !predefinedAgentConfigKeys.includes(key))
    );
  }, [predefinedAgentConfigKeys, newConfig.settings]);

  const checkIfAdvancedConfigKeyExists = useCallback(
    (newKey: string, oldKey: string) => newKey !== oldKey && unknownAgentConfigs.has(newKey),
    [unknownAgentConfigs]
  );

  const checkIfPredefinedConfigKeyExists = useCallback(
    (key: string) => predefinedAgentConfigKeys.includes(key),
    [predefinedAgentConfigKeys]
  );

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
      // Maintain the order by recreating the config object while preserving key positions
      const newConfigs: Record<string, string> = {};

      Object.entries(prev.settings).forEach(([key, val]) => {
        if (key === oldKey) {
          // Replace the old key with the new key at the same position
          newConfigs[newKey] = value;
        } else {
          // Keep other keys in their original positions
          newConfigs[key] = val;
        }
      });

      return {
        ...prev,
        settings: newConfigs,
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

  const deleteRow = (key: string, index: number) => {
    if (newConfig.settings[key] !== undefined) {
      setRemovedConfigCount((prev) => prev + 1);
    }
    setValidationErrors((prev) => ({
      ...prev,
      [`key${index}`]: false,
      [`value${index}`]: false,
    }));
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
          {agentLanguage && (
            <>
              <EuiSpacer size="s" />
              <EuiLink
                data-test-subj="apmAdvancedConfigurationDocumentationLink"
                href={`https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/${agentLanguage}/configuration`}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.apm.agentConfig.settingsPage.advancedConfigurationLearnMore"
                  defaultMessage="Learn more about configuration options"
                />
              </EuiLink>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="rowReverse" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="apmSettingsAddAdvancedConfigurationButton"
                iconType="plusInCircle"
                onClick={addNewRow}
              >
                {i18n.translate('xpack.apm.settingsPage.addCustomSettingButton', {
                  defaultMessage: 'Add custom setting',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {[...unknownAgentConfigs].map(([configKey, configValue], index, array) => (
        // Use reverse index as key prop to allow adding new rows at the top
        <Fragment key={array.length - 1 - index}>
          {index > 0 && <EuiSpacer size="s" />}
          <EuiFlexGroup>
            <EuiFlexItem>
              <AdvancedConfigKeyInput
                configKey={configKey}
                configValue={configValue}
                index={index}
                setValidationErrors={setValidationErrors}
                onUpdate={updateKey}
                checkIfAdvancedConfigKeyExists={checkIfAdvancedConfigKeyExists}
                checkIfPredefinedConfigKeyExists={checkIfPredefinedConfigKeyExists}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <AdvancedConfigValueInput
                configValue={configValue}
                configKey={configKey}
                index={index}
                setValidationErrors={setValidationErrors}
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
