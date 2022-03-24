/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiIconTip,
  EuiCheckboxGroup,
  EuiButton,
  EuiLink,
  EuiFieldNumber,
  EuiFieldText,
  EuiSuperSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { dataTypes } from '../../../../../../../common';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import { useStartServices } from '../../../../hooks';

import { AgentPolicyPackageBadge } from '../../../../components';

import { policyHasFleetServer } from '../../../agents/services/has_fleet_server';

import { AgentPolicyDeleteProvider } from '../agent_policy_delete_provider';
import type { ValidationResults } from '../agent_policy_validation';

import { useOutputOptions, DEFAULT_OUTPUT_VALUE } from './hooks';

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  validation: ValidationResults;
  isEditing?: boolean;
  onDelete?: () => void;
}

export const AgentPolicyAdvancedOptionsContent: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  validation,
  isEditing = false,
  onDelete = () => {},
}) => {
  const { docLinks } = useStartServices();
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const {
    dataOutputOptions,
    monitoringOutputOptions,
    isLoading: isLoadingOptions,
  } = useOutputOptions(agentPolicy);

  // agent monitoring checkbox group can appear multiple times in the DOM, ids have to be unique to work correctly
  const monitoringCheckboxIdSuffix = Date.now();

  return (
    <>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.descriptionFieldLabel"
              defaultMessage="Description"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.descriptionDescription"
            defaultMessage="Add a description of how this policy will be used."
          />
        }
      >
        <EuiFormRow
          fullWidth
          key="description"
          error={
            touchedFields.description && validation.description ? validation.description : null
          }
          isInvalid={Boolean(touchedFields.description && validation.description)}
        >
          <EuiFieldText
            disabled={agentPolicy.is_managed === true}
            fullWidth
            value={agentPolicy.description}
            onChange={(e) => updateAgentPolicy({ description: e.target.value })}
            isInvalid={Boolean(touchedFields.description && validation.description)}
            onBlur={() => setTouchedFields({ ...touchedFields, description: true })}
            placeholder={i18n.translate('xpack.fleet.agentPolicyForm.descriptionFieldPlaceholder', {
              defaultMessage: 'Optional description',
            })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
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
            defaultMessage="Namespaces are a user-configurable arbitrary grouping that makes it easier to search for data and manage user permissions. A policy namespace is used to name its integration's data streams. {fleetUserGuide}."
            values={{
              fleetUserGuide: (
                <EuiLink href={docLinks.links.fleet.datastreamsNamingScheme} target="_blank">
                  {i18n.translate(
                    'xpack.fleet.agentPolicyForm.nameSpaceFieldDescription.fleetUserGuideLabel',
                    { defaultMessage: 'Learn more' }
                  )}
                </EuiLink>
              ),
            }}
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
            defaultMessage="Collecting monitoring logs and metrics will also create an {agent} integration. Monitoring data will be written to the default namespace specified above."
            values={{
              agent: (
                <AgentPolicyPackageBadge pkgName={'elastic_agent'} pkgTitle={'Elastic Agent'} />
              ),
            }}
          />
        }
      >
        <EuiCheckboxGroup
          disabled={agentPolicy.is_managed === true}
          options={[
            {
              id: `${dataTypes.Logs}_${monitoringCheckboxIdSuffix}`,
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
              id: `${dataTypes.Metrics}_${monitoringCheckboxIdSuffix}`,
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
            (acc: { [key: string]: boolean }, key) => {
              acc[`${key}_${monitoringCheckboxIdSuffix}`] = true;
              return acc;
            },
            { logs: false, metrics: false }
          )}
          onChange={(longId) => {
            const id = longId.split('_')[0];
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
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.unenrollmentTimeoutLabel"
              defaultMessage="Unenrollment timeout"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.unenrollmentTimeoutDescription"
            defaultMessage="An optional timeout in seconds. If provided, an agent will automatically unenroll after being gone for this period of time."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.unenroll_timeout && validation.unenroll_timeout
              ? validation.unenroll_timeout
              : null
          }
          isInvalid={Boolean(touchedFields.unenroll_timeout && validation.unenroll_timeout)}
        >
          <EuiFieldNumber
            fullWidth
            disabled={agentPolicy.is_managed === true}
            value={agentPolicy.unenroll_timeout || ''}
            min={0}
            onChange={(e) => {
              updateAgentPolicy({
                unenroll_timeout: e.target.value ? Number(e.target.value) : 0,
              });
            }}
            isInvalid={Boolean(touchedFields.unenroll_timeout && validation.unenroll_timeout)}
            onBlur={() => setTouchedFields({ ...touchedFields, unenroll_timeout: true })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.dataOutputLabel"
              defaultMessage="Output for integrations"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.dataOutputDescription"
            defaultMessage="Select which output to use for data from integrations."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.data_output_id && validation.data_output_id
              ? validation.data_output_id
              : null
          }
          isInvalid={Boolean(touchedFields.data_output_id && validation.data_output_id)}
        >
          <EuiSuperSelect
            valueOfSelected={agentPolicy.data_output_id || DEFAULT_OUTPUT_VALUE}
            fullWidth
            isLoading={isLoadingOptions}
            onChange={(e) => {
              updateAgentPolicy({
                data_output_id: e !== DEFAULT_OUTPUT_VALUE ? e : null,
              });
            }}
            options={dataOutputOptions}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.monitoringOutputLabel"
              defaultMessage="Output for agent monitoring"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.monitoringOutputDescription"
            defaultMessage="Select which output to use for the agents own monitoring data."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.monitoring_output_id && validation.monitoring_output_id
              ? validation.monitoring_output_id
              : null
          }
          isInvalid={Boolean(touchedFields.monitoring_output_id && validation.monitoring_output_id)}
        >
          <EuiSuperSelect
            valueOfSelected={agentPolicy.monitoring_output_id || DEFAULT_OUTPUT_VALUE}
            fullWidth
            isLoading={isLoadingOptions}
            onChange={(e) => {
              updateAgentPolicy({
                monitoring_output_id: e !== DEFAULT_OUTPUT_VALUE ? e : null,
              });
            }}
            options={monitoringOutputOptions}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      {isEditing && 'id' in agentPolicy && !agentPolicy.is_managed ? (
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
              <AgentPolicyDeleteProvider
                hasFleetServer={policyHasFleetServer(agentPolicy as AgentPolicy)}
              >
                {(deleteAgentPolicyPrompt) => {
                  return (
                    <EuiButton
                      color="danger"
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
            </>
          }
        />
      ) : null}
    </>
  );
};
