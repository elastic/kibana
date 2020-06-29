/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiDescribedFormGroup,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiComboBox,
  EuiIconTip,
  EuiCheckboxGroup,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { NewAgentConfig, AgentConfig } from '../../../types';
import { AgentConfigDeleteProvider } from './config_delete_provider';

interface ValidationResults {
  [key: string]: JSX.Element[];
}

const StyledEuiAccordion = styled(EuiAccordion)`
  .ingest-active-button {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

export const agentConfigFormValidation = (
  agentConfig: Partial<NewAgentConfig | AgentConfig>
): ValidationResults => {
  const errors: ValidationResults = {};

  if (!agentConfig.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.ingestManager.agentConfigForm.nameRequiredErrorMessage"
        defaultMessage="Agent config name is required"
      />,
    ];
  }

  if (!agentConfig.namespace?.trim()) {
    errors.namespace = [
      <FormattedMessage
        id="xpack.ingestManager.agentConfigForm.namespaceRequiredErrorMessage"
        defaultMessage="A namespace is required"
      />,
    ];
  }

  return errors;
};

interface Props {
  agentConfig: Partial<NewAgentConfig | AgentConfig>;
  updateAgentConfig: (u: Partial<NewAgentConfig | AgentConfig>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  isEditing?: boolean;
  onDelete?: () => void;
}

export const AgentConfigForm: React.FunctionComponent<Props> = ({
  agentConfig,
  updateAgentConfig,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
  isEditing = false,
  onDelete = () => {},
}) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const fields: Array<{
    name: 'name' | 'description' | 'namespace';
    label: JSX.Element;
    placeholder: string;
  }> = useMemo(() => {
    return [
      {
        name: 'name',
        label: (
          <FormattedMessage
            id="xpack.ingestManager.agentConfigForm.nameFieldLabel"
            defaultMessage="Name"
          />
        ),
        placeholder: i18n.translate('xpack.ingestManager.agentConfigForm.nameFieldPlaceholder', {
          defaultMessage: 'Choose a name',
        }),
      },
      {
        name: 'description',
        label: (
          <FormattedMessage
            id="xpack.ingestManager.agentConfigForm.descriptionFieldLabel"
            defaultMessage="Description"
          />
        ),
        placeholder: i18n.translate(
          'xpack.ingestManager.agentConfigForm.descriptionFieldPlaceholder',
          {
            defaultMessage: 'How will this configuration be used?',
          }
        ),
      },
    ];
  }, []);

  const generalSettingsWrapper = (children: JSX.Element[]) => (
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.ingestManager.configForm.generalSettingsGroupTitle"
            defaultMessage="General settings"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.ingestManager.configForm.generalSettingsGroupDescription"
          defaultMessage="Choose a name and description for your agent configuration."
        />
      }
    >
      {children}
    </EuiDescribedFormGroup>
  );

  const generalFields = fields.map(({ name, label, placeholder }) => {
    return (
      <EuiFormRow
        fullWidth
        key={name}
        label={label}
        error={touchedFields[name] && validation[name] ? validation[name] : null}
        isInvalid={Boolean(touchedFields[name] && validation[name])}
      >
        <EuiFieldText
          fullWidth
          value={agentConfig[name]}
          onChange={(e) => updateAgentConfig({ [name]: e.target.value })}
          isInvalid={Boolean(touchedFields[name] && validation[name])}
          onBlur={() => setTouchedFields({ ...touchedFields, [name]: true })}
          placeholder={placeholder}
        />
      </EuiFormRow>
    );
  });

  const advancedOptionsContent = (
    <>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.ingestManager.agentConfigForm.namespaceFieldLabel"
              defaultMessage="Default namespace"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.ingestManager.agentConfigForm.namespaceFieldDescription"
            defaultMessage="Apply a default namespace to integrations that use this configuration. Integrations can specify their own namespaces."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={touchedFields.namespace && validation.namespace ? validation.namespace : null}
          isInvalid={Boolean(touchedFields.namespace && validation.namespace)}
        >
          <EuiComboBox
            fullWidth
            singleSelection
            noSuggestions
            selectedOptions={agentConfig.namespace ? [{ label: agentConfig.namespace }] : []}
            onCreateOption={(value: string) => {
              updateAgentConfig({ namespace: value });
            }}
            onChange={(selectedOptions) => {
              updateAgentConfig({
                namespace: (selectedOptions.length ? selectedOptions[0] : '') as string,
              });
            }}
            isInvalid={Boolean(touchedFields.namespace && validation.namespace)}
            onBlur={() => setTouchedFields({ ...touchedFields, namespace: true })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.ingestManager.agentConfigForm.monitoringLabel"
              defaultMessage="Agent monitoring"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.ingestManager.agentConfigForm.monitoringDescription"
            defaultMessage="Collect data about your agents for debugging and tracking performance."
          />
        }
      >
        <EuiCheckboxGroup
          options={[
            {
              id: 'logs',
              label: i18n.translate(
                'xpack.ingestManager.agentConfigForm.monitoringLogsFieldLabel',
                { defaultMessage: 'Collect agent logs' }
              ),
            },
            {
              id: 'metrics',
              label: i18n.translate(
                'xpack.ingestManager.agentConfigForm.monitoringMetricsFieldLabel',
                { defaultMessage: 'Collect agent metrics' }
              ),
            },
          ]}
          idToSelectedMap={(agentConfig.monitoring_enabled || []).reduce(
            (acc: { logs: boolean; metrics: boolean }, key) => {
              acc[key] = true;
              return acc;
            },
            { logs: false, metrics: false }
          )}
          onChange={(id) => {
            if (id !== 'logs' && id !== 'metrics') {
              return;
            }

            const hasLogs =
              agentConfig.monitoring_enabled && agentConfig.monitoring_enabled.indexOf(id) >= 0;

            const previousValues = agentConfig.monitoring_enabled || [];
            updateAgentConfig({
              monitoring_enabled: hasLogs
                ? previousValues.filter((type) => type !== id)
                : [...previousValues, id],
            });
          }}
        />
      </EuiDescribedFormGroup>
      {isEditing && 'id' in agentConfig ? (
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.ingestManager.configForm.deleteConfigGroupTitle"
                defaultMessage="Delete configuration"
              />
            </h4>
          }
          description={
            <>
              <FormattedMessage
                id="xpack.ingestManager.configForm.deleteConfigGroupDescription"
                defaultMessage="Existing data will not be deleted."
              />
              <EuiSpacer size="s" />
              <AgentConfigDeleteProvider>
                {(deleteAgentConfigPrompt) => {
                  return (
                    <EuiButton
                      color="danger"
                      disabled={Boolean(agentConfig.is_default)}
                      onClick={() => deleteAgentConfigPrompt(agentConfig.id!, onDelete)}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.configForm.deleteConfigActionText"
                        defaultMessage="Delete configuration"
                      />
                    </EuiButton>
                  );
                }}
              </AgentConfigDeleteProvider>
              {agentConfig.is_default ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText color="subdued" size="xs">
                    <FormattedMessage
                      id="xpack.ingestManager.configForm.unableToDeleteDefaultConfigText"
                      defaultMessage="Default configuration cannot be deleted"
                    />
                  </EuiText>
                </>
              ) : null}
            </>
          }
        />
      ) : null}
    </>
  );

  return (
    <EuiForm>
      {!isEditing ? generalFields : generalSettingsWrapper(generalFields)}
      {!isEditing ? (
        <EuiFormRow
          label={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ingestManager.agentConfigForm.systemMonitoringFieldLabel"
                defaultMessage="Optional"
              />
            </EuiText>
          }
        >
          <EuiSwitch
            showLabel={true}
            label={
              <>
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigForm.systemMonitoringText"
                  defaultMessage="Collect system metrics"
                />{' '}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.ingestManager.agentConfigForm.systemMonitoringTooltipText',
                    {
                      defaultMessage:
                        'Enable this option to bootstrap your configuration with an integration that collects system metrics and information.',
                    }
                  )}
                  position="right"
                  type="iInCircle"
                />
              </>
            }
            checked={withSysMonitoring}
            onChange={() => {
              updateSysMonitoring(!withSysMonitoring);
            }}
          />
        </EuiFormRow>
      ) : null}
      {!isEditing ? (
        <>
          <EuiHorizontalRule />
          <EuiSpacer size="xs" />
          <StyledEuiAccordion
            id="advancedOptions"
            buttonContent={
              <FormattedMessage
                id="xpack.ingestManager.agentConfigForm.advancedOptionsToggleLabel"
                defaultMessage="Advanced options"
              />
            }
            buttonClassName="ingest-active-button"
          >
            <EuiSpacer size="l" />
            {advancedOptionsContent}
          </StyledEuiAccordion>
        </>
      ) : (
        advancedOptionsContent
      )}
    </EuiForm>
  );
};
