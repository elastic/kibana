/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiIconTip,
  EuiCheckbox,
  EuiLink,
  EuiAccordion,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';

import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import { useStartServices } from '../../../../hooks';
import type { ValidationResults } from '../agent_policy_validation';

const StyledEuiAccordion = styled(EuiAccordion)`
  margin-block-start: ${(props) => props.theme.eui.euiSizeS};
  .ingest-active-button {
    color: ${(props) => props.theme.eui.euiColorPrimary};
  }
`;

const PushedDescribedFormGroup = styled(EuiDescribedFormGroup)`
  h3,
  .euiDescribedFormGroup__description {
    padding-left: ${(props) => props.theme.eui.euiSizeL};
  }
`;

export const AgentPolicyAdvancedMonitoringOptions: React.FunctionComponent<{
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  disabled: boolean;
  validation: ValidationResults;
  touchedFields: { [key: string]: boolean };
  updateTouchedFields: (fields: { [key: string]: boolean }) => void;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
}> = ({
  agentPolicy,
  disabled,
  validation,
  touchedFields,
  updateTouchedFields,
  updateAgentPolicy,
}) => {
  const { docLinks } = useStartServices();

  return (
    <StyledEuiAccordion
      id="advancedMonitoringOptions"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.agentPolicyForm.advancedMonitoringOptionsToggleLabel"
          defaultMessage="Advanced monitoring options"
        />
      }
      buttonClassName={disabled ? undefined : 'ingest-active-button'}
      isDisabled={disabled === true}
    >
      <EuiSpacer size="s" />
      <PushedDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.monitoringHttpLabel"
              defaultMessage="HTTP monitoring endpoint"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.monitoringHttpDescription"
            defaultMessage="Enable a liveness HTTP endpoint that returns the overall health of Elastic Agent. This can be used by Kubernetes to restart the container, for example. {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.httpMonitoring} target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.monitoringHttpDescription.learnMoreLinkLabel"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        {/* Enable base HTTP monitoring endpoint */}
        <EuiCheckbox
          id="httpMonitoringEnabled"
          label={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.enableHttpMonitoringLabel"
              defaultMessage="Enable HTTP endpoint at {monitoringEndpoint}"
              values={{
                monitoringEndpoint: <EuiCode>/liveness</EuiCode>,
              }}
            />
          }
          disabled={disabled}
          checked={agentPolicy.monitoring_http?.enabled}
          onChange={(e) => {
            const isEnabled = e.target.checked;
            const host = isEnabled && !agentPolicy.monitoring_http?.host ? 'localhost' : undefined;
            const port = isEnabled && !agentPolicy.monitoring_http?.port ? 6791 : undefined;
            updateTouchedFields({ 'monitoring_http.enabled': true });
            updateAgentPolicy({
              monitoring_http: {
                ...agentPolicy.monitoring_http,
                ...(host ? { host } : {}),
                ...(port ? { port } : {}),
                enabled: isEnabled,
              },
            });
          }}
        />

        <EuiSpacer size="s" />

        {/* Host and port */}
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.monitoringHttp.hostFieldLabel"
                  defaultMessage="Host"
                />
              }
              isDisabled={disabled || !agentPolicy.monitoring_http?.enabled}
              error={
                touchedFields['monitoring_http.host'] && validation['monitoring_http.host']
                  ? validation['monitoring_http.host']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_http.host'] && validation['monitoring_http.host']
              )}
            >
              <EuiFieldText
                fullWidth
                disabled={disabled || !agentPolicy.monitoring_http?.enabled}
                placeholder="localhost"
                value={agentPolicy.monitoring_http?.host}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_http: {
                      ...agentPolicy.monitoring_http!,
                      host: e.target.value,
                    },
                  });
                }}
                onBlur={() => updateTouchedFields({ 'monitoring_http.host': true })}
                isInvalid={Boolean(
                  touchedFields['monitoring_http.host'] && validation['monitoring_http.host']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.monitoringHttp.portFieldLabel"
                  defaultMessage="Port"
                />
              }
              isDisabled={disabled || !agentPolicy.monitoring_http?.enabled}
              error={
                touchedFields['monitoring_http.port'] && validation['monitoring_http.port']
                  ? validation['monitoring_http.port']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_http.port'] && validation['monitoring_http.port']
              )}
            >
              <EuiFieldNumber
                fullWidth
                disabled={disabled || !agentPolicy.monitoring_http?.enabled}
                placeholder="6791"
                min={1}
                max={65535}
                value={agentPolicy.monitoring_http?.port}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_http: {
                      ...agentPolicy.monitoring_http!,
                      port: e.target.value ? Number(e.target.value) : 0,
                    },
                  });
                }}
                onBlur={() => updateTouchedFields({ 'monitoring_http.port': true })}
                isInvalid={Boolean(
                  touchedFields['monitoring_http.port'] && validation['monitoring_http.port']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Metrics buffer endpoint */}
        <EuiCheckbox
          id="httpMonitoringMetricsBufferEnabled"
          label={
            <>
              <FormattedMessage
                id="xpack.fleet.agentPolicyForm.enableHttpMonitoringBufferLabel"
                defaultMessage="Enable metrics buffer at {bufferEndpoint}"
                values={{
                  bufferEndpoint: <EuiCode>/buffer</EuiCode>,
                }}
              />{' '}
              <EuiIconTip
                type="iInCircle"
                color="subdued"
                content={
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.enableHttpMonitoringBufferWarning"
                    defaultMessage="Not recommended if the monitoring endpoint is accessible over a network"
                  />
                }
              />
            </>
          }
          disabled={disabled || !agentPolicy.monitoring_http?.enabled}
          checked={agentPolicy.monitoring_http?.buffer?.enabled}
          onChange={(e) => {
            updateTouchedFields({ 'monitoring_http.buffer.enabled': true });
            updateAgentPolicy({
              monitoring_http: {
                ...agentPolicy.monitoring_http!,
                buffer: {
                  enabled: e.target.checked,
                },
              },
            });
          }}
        />

        <EuiSpacer size="s" />

        {/* Profiling endpoint */}
        <EuiCheckbox
          id="httpMonitoringProfilingEnabled"
          label={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.enableHttpMonitoringPprofLabel"
              defaultMessage="Enable profiling at {profilingEndpoint}"
              values={{
                profilingEndpoint: <EuiCode>/debug/pprof</EuiCode>,
              }}
            />
          }
          disabled={disabled || !agentPolicy.monitoring_http?.enabled}
          checked={agentPolicy.monitoring_pprof_enabled}
          onChange={(e) => {
            updateTouchedFields({ monitoring_pprof_enabled: true });
            updateAgentPolicy({
              monitoring_pprof_enabled: e.target.checked,
            });
          }}
        />
      </PushedDescribedFormGroup>
    </StyledEuiAccordion>
  );
};
