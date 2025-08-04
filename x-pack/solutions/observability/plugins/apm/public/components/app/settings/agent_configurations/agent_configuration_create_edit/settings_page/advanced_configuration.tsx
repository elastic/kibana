/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
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
}: {
  newConfig: AgentConfigurationIntake;
  settingsDefinitionsByAgent: SettingDefinition[];
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  setRemovedSettingsCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const agentSettingKeys = useMemo(
    () => settingsDefinitionsByAgent.map((setting) => setting.key),
    [settingsDefinitionsByAgent]
  );

  const unknownAgentSettings = useMemo(() => {
    return Object.entries(newConfig.settings).filter(([key]) => !agentSettingKeys.includes(key));
  }, [agentSettingKeys, newConfig.settings]);

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
              onClick={() =>
                setNewConfig((prev) => {
                  return {
                    ...prev,
                    settings: {
                      ...prev.settings,
                      ['']: '',
                    },
                  };
                })
              }
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
              <EuiFormRow
                label={i18n.translate('xpack.apm.agentConfig.settingsPage.keyLabel', {
                  defaultMessage: 'Key',
                })}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="apmSettingsAdvancedConfigurationKeyField"
                  aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.keyAriaLabel', {
                    defaultMessage: 'Advanced configuration key',
                  })}
                  fullWidth
                  value={settingKey}
                  onChange={(e) => {
                    setNewConfig((prev) => {
                      const { [settingKey]: deleted, ...rest } = prev.settings;
                      return {
                        ...prev,
                        settings: {
                          ...rest,
                          [e.target.value]: settingValue,
                        },
                      };
                    });
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.apm.agentConfig.settingsPage.valueLabel', {
                  defaultMessage: 'Value',
                })}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="apmSettingsAdvancedConfigurationValueField"
                  aria-label={i18n.translate('xpack.apm.agentConfig.settingsPage.valueAriaLabel', {
                    defaultMessage: 'Advanced configuration value',
                  })}
                  fullWidth
                  value={settingValue}
                  onChange={(e) => {
                    setNewConfig((prev) => {
                      return {
                        ...prev,
                        settings: {
                          ...prev.settings,
                          [settingKey]: e.target.value,
                        },
                      };
                    });
                  }}
                  append={
                    <EuiButtonIcon
                      data-test-subj="apmSettingsRemoveAdvancedConfigurationButton"
                      aria-label={i18n.translate(
                        'xpack.apm.agentConfig.settingsPage.removeButtonAriaLabel',
                        {
                          defaultMessage: 'Remove advanced configuration',
                        }
                      )}
                      iconType="trash"
                      color={'danger'}
                      onClick={() => {
                        if (newConfig.settings[settingKey]) {
                          setRemovedSettingsCount((prev) => prev + 1);
                        }
                        setNewConfig((prev) => {
                          const { [settingKey]: deleted, ...rest } = prev.settings;
                          return {
                            ...prev,
                            settings: rest,
                          };
                        });
                      }}
                    />
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ))}
    </>
  );
}
