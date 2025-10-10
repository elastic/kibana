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
  settingsDefinitions,
  revalidate,
  onChange,
  onDelete,
  addNewRow,
  addValidationError,
  removeValidationError,
}: {
  newConfig: AgentConfigurationIntake;
  settingsDefinitions: SettingDefinition[];
  revalidate: boolean;
  onChange: ({ key, value, oldKey }: { key: string; value?: string; oldKey?: string }) => void;
  onDelete: (key: string, index: number) => void;
  addNewRow: () => void;
  addValidationError: (key: string, active: boolean) => void;
  removeValidationError: (key: string) => void;
}) {
  const agentLanguage = newConfig.agent_name?.split('/')[1] || '';

  const predefinedAgentConfigKeys = useMemo(
    () => new Set(settingsDefinitions.map((setting) => setting.key)),
    [settingsDefinitions]
  );

  const unknownAgentConfigs = useMemo(() => {
    return new Map(
      Object.entries(newConfig.settings).filter(([key]) => !predefinedAgentConfigKeys.has(key))
    );
  }, [predefinedAgentConfigKeys, newConfig.settings]);

  // Validations
  const checkIfAdvancedConfigKeyExists = useCallback(
    (key: string) => unknownAgentConfigs.has(key),
    [unknownAgentConfigs]
  );
  const checkIfPredefinedConfigKeyExists = useCallback(
    (key: string) => predefinedAgentConfigKeys.has(key),
    [predefinedAgentConfigKeys]
  );

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
                defaultMessage="Advanced configuration allows you to define custom settings that are not covered by the standard predefined options above. These settings are passed directly to your EDOT SDK. Use with caution as incorrect configuration may affect your SDK's behavior."
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
      {[...unknownAgentConfigs].map(([configKey, configValue], index) => (
        // Use reverse index as key prop to allow adding new rows at the top
        <Fragment key={unknownAgentConfigs.size - 1 - index}>
          {index > 0 && <EuiSpacer size="s" />}
          <EuiFlexGroup>
            <EuiFlexItem>
              <AdvancedConfigKeyInput
                configKey={configKey}
                id={index}
                showLabel={index === 0}
                revalidate={revalidate}
                onChange={onChange}
                checkIfAdvancedConfigKeyExists={checkIfAdvancedConfigKeyExists}
                checkIfPredefinedConfigKeyExists={checkIfPredefinedConfigKeyExists}
                addValidationError={addValidationError}
                removeValidationError={removeValidationError}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <AdvancedConfigValueInput
                configValue={configValue}
                configKey={configKey}
                id={index}
                showLabel={index === 0}
                revalidate={revalidate}
                onChange={onChange}
                onDelete={onDelete}
                addValidationError={addValidationError}
                removeValidationError={removeValidationError}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ))}
      <EuiSpacer size="m" />
    </>
  );
}
