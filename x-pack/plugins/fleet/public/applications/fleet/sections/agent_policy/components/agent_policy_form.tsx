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
  EuiText,
  EuiComboBox,
  EuiIconTip,
  EuiCheckbox,
  EuiCheckboxGroup,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { dataTypes } from '../../../../../../common';
import { NewAgentPolicy, AgentPolicy } from '../../../types';
import { isValidNamespace } from '../../../services';
import { AgentPolicyDeleteProvider } from './agent_policy_delete_provider';

interface ValidationResults {
  [key: string]: Array<JSX.Element | string>;
}

const StyledEuiAccordion = styled(EuiAccordion)`
  .ingest-active-button {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

export const agentPolicyFormValidation = (
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>
): ValidationResults => {
  const errors: ValidationResults = {};
  const namespaceValidation = isValidNamespace(agentPolicy.namespace || '');

  if (!agentPolicy.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.fleet.agentPolicyForm.nameRequiredErrorMessage"
        defaultMessage="Agent policy name is required"
      />,
    ];
  }

  if (!namespaceValidation.valid && namespaceValidation.error) {
    errors.namespace = [namespaceValidation.error];
  }

  return errors;
};

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  isEditing?: boolean;
  onDelete?: () => void;
}

export const AgentPolicyForm: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
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
          <FormattedMessage id="xpack.fleet.agentPolicyForm.nameFieldLabel" defaultMessage="Name" />
        ),
        placeholder: i18n.translate('xpack.fleet.agentPolicyForm.nameFieldPlaceholder', {
          defaultMessage: 'Choose a name',
        }),
      },
      {
        name: 'description',
        label: (
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.descriptionFieldLabel"
            defaultMessage="Description"
          />
        ),
        placeholder: i18n.translate('xpack.fleet.agentPolicyForm.descriptionFieldPlaceholder', {
          defaultMessage: 'How will this policy be used?',
        }),
      },
    ];
  }, []);

  const generalSettingsWrapper = (children: JSX.Element[]) => (
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.fleet.policyForm.generalSettingsGroupTitle"
            defaultMessage="General settings"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.fleet.policyForm.generalSettingsGroupDescription"
          defaultMessage="Choose a name and description for your agent policy."
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
          value={agentPolicy[name]}
          onChange={(e) => updateAgentPolicy({ [name]: e.target.value })}
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
              id="xpack.fleet.agentPolicyForm.namespaceFieldLabel"
              defaultMessage="Default namespace"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.namespaceFieldDescription"
            defaultMessage="Apply a default namespace to integrations that use this policy. Integrations can specify their own namespaces."
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
            selectedOptions={agentPolicy.namespace ? [{ label: agentPolicy.namespace }] : []}
            onCreateOption={(value: string) => {
              updateAgentPolicy({ namespace: value });
            }}
            onChange={(selectedOptions) => {
              updateAgentPolicy({
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
              id="xpack.fleet.agentPolicyForm.monitoringLabel"
              defaultMessage="Agent monitoring"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.monitoringDescription"
            defaultMessage="Collect data about your agents for debugging and tracking performance."
          />
        }
      >
        <EuiCheckboxGroup
          options={[
            {
              id: dataTypes.Logs,
              label: (
                <>
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.monitoringLogsFieldLabel"
                    defaultMessage="Collect agent logs"
                  />{' '}
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.fleet.agentPolicyForm.monitoringLogsTooltipText',
                      {
                        defaultMessage: 'Collect logs from Elastic Agents that use this policy.',
                      }
                    )}
                    position="right"
                    type="iInCircle"
                    color="subdued"
                  />
                </>
              ),
            },
            {
              id: dataTypes.Metrics,
              label: (
                <>
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.monitoringMetricsFieldLabel"
                    defaultMessage="Collect agent metrics"
                  />{' '}
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.fleet.agentPolicyForm.monitoringMetricsTooltipText',
                      {
                        defaultMessage: 'Collect metrics from Elastic Agents that use this policy.',
                      }
                    )}
                    position="right"
                    type="iInCircle"
                    color="subdued"
                  />
                </>
              ),
            },
          ]}
          idToSelectedMap={(agentPolicy.monitoring_enabled || []).reduce(
            (acc: { logs: boolean; metrics: boolean }, key) => {
              acc[key] = true;
              return acc;
            },
            { logs: false, metrics: false }
          )}
          onChange={(id) => {
            if (id !== dataTypes.Logs && id !== dataTypes.Metrics) {
              return;
            }

            const hasLogs =
              agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.indexOf(id) >= 0;

            const previousValues = agentPolicy.monitoring_enabled || [];
            updateAgentPolicy({
              monitoring_enabled: hasLogs
                ? previousValues.filter((type) => type !== id)
                : [...previousValues, id],
            });
          }}
        />
      </EuiDescribedFormGroup>
      {isEditing && 'id' in agentPolicy ? (
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.fleet.policyForm.deletePolicyGroupTitle"
                defaultMessage="Delete policy"
              />
            </h4>
          }
          description={
            <>
              <FormattedMessage
                id="xpack.fleet.policyForm.deletePolicyGroupDescription"
                defaultMessage="Existing data will not be deleted."
              />
              <EuiSpacer size="s" />
              <AgentPolicyDeleteProvider>
                {(deleteAgentPolicyPrompt) => {
                  return (
                    <EuiButton
                      color="danger"
                      disabled={Boolean(agentPolicy.is_default)}
                      onClick={() => deleteAgentPolicyPrompt(agentPolicy.id!, onDelete)}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyForm.deletePolicyActionText"
                        defaultMessage="Delete policy"
                      />
                    </EuiButton>
                  );
                }}
              </AgentPolicyDeleteProvider>
              {agentPolicy.is_default ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText color="subdued" size="xs">
                    <FormattedMessage
                      id="xpack.fleet.policyForm.unableToDeleteDefaultPolicyText"
                      defaultMessage="Default policy cannot be deleted"
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
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.systemMonitoringFieldLabel"
              defaultMessage="System monitoring"
            />
          }
        >
          <EuiCheckbox
            id="agentPolicyFormSystemMonitoringCheckbox"
            label={
              <>
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.systemMonitoringText"
                  defaultMessage="Collect system metrics"
                />{' '}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.fleet.agentPolicyForm.systemMonitoringTooltipText',
                    {
                      defaultMessage:
                        'Enable this option to bootstrap your policy with an integration that collects system metrics and information.',
                    }
                  )}
                  position="right"
                  type="iInCircle"
                  color="subdued"
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
                id="xpack.fleet.agentPolicyForm.advancedOptionsToggleLabel"
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
