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

      {/* HTTP monitoring endpoint */}
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
        <EuiSpacer size="l" />

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
                  id="xpack.fleet.agentPolicyForm.monitoringHttp.hostFieldLabel"
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
                  id="xpack.fleet.agentPolicyForm.monitoringHttp.portFieldLabel"
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

      {/* Diagnostics rate limiting */}
      <PushedDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.diagnosticsRateLimitLabel"
              defaultMessage="Diagnostics rate limiting"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.diagnosticsRateLimitDescription"
            defaultMessage="Rate limit for the request diagnostics action handler. Does not affect diagnostics collected through the CLI. {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.httpMonitoring} target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.diagnosticsRateLimitDescription.learnMoreLinkLabel"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.diagnosticsRateLimit.intervalFieldLabel"
                  defaultMessage="Interval"
                />
              }
              isDisabled={disabled}
              error={
                touchedFields['monitoring_diagnostics.limit.interval'] &&
                validation['monitoring_diagnostics.limit.interval']
                  ? validation['monitoring_diagnostics.limit.interval']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_diagnostics.limit.interval'] &&
                  validation['monitoring_diagnostics.limit.interval']
              )}
            >
              <EuiFieldText
                disabled={disabled}
                placeholder="1m"
                value={agentPolicy.monitoring_diagnostics?.limit?.interval}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_diagnostics: {
                      ...agentPolicy.monitoring_diagnostics,
                      limit: {
                        ...agentPolicy.monitoring_diagnostics?.limit,
                        interval: e.target.value ? e.target.value : undefined,
                      },
                    },
                  });
                }}
                onBlur={() =>
                  updateTouchedFields({ 'monitoring_diagnostics.limit.interval': true })
                }
                isInvalid={Boolean(
                  touchedFields['monitoring_diagnostics.limit.interval'] &&
                    validation['monitoring_diagnostics.limit.interval']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.diagnosticsRateLimit.burstFieldLabel"
                  defaultMessage="Burst"
                />
              }
              isDisabled={disabled}
              error={
                touchedFields['monitoring_diagnostics.limit.burst'] &&
                validation['monitoring_diagnostics.limit.burst']
                  ? validation['monitoring_diagnostics.limit.burst']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_diagnostics.limit.burst'] &&
                  validation['monitoring_diagnostics.limit.burst']
              )}
            >
              <EuiFieldNumber
                disabled={disabled}
                placeholder="1"
                min={1}
                value={agentPolicy.monitoring_diagnostics?.limit?.burst}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_diagnostics: {
                      ...agentPolicy.monitoring_diagnostics,
                      limit: {
                        ...agentPolicy.monitoring_diagnostics?.limit,
                        burst: e.target.value ? Number(e.target.value) : undefined,
                      },
                    },
                  });
                }}
                onBlur={() => updateTouchedFields({ 'monitoring_diagnostics.limit.burst': true })}
                isInvalid={Boolean(
                  touchedFields['monitoring_diagnostics.limit.burst'] &&
                    validation['monitoring_diagnostics.limit.burst']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>{/* Empty to match colums with upload fields below */}</EuiFlexItem>
        </EuiFlexGroup>
      </PushedDescribedFormGroup>

      {/* Diagnostics file upload */}
      <PushedDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.diagnosticsFileUploadLabel"
              defaultMessage="Diagnostics file upload"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.diagnosticsFileUploadDescription"
            defaultMessage="Retry configuration for the file upload client. Client may retry failed requests with exponential backoff. {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.httpMonitoring} target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.diagnosticsFileUploadDescription.learnMoreLinkLabel"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.diagnosticsFileUpload.maxRetriesFieldLabel"
                  defaultMessage="Max retries"
                />
              }
              isDisabled={disabled}
              error={
                touchedFields['monitoring_diagnostics.uploader.max_retries'] &&
                validation['monitoring_diagnostics.uploader.max_retries']
                  ? validation['monitoring_diagnostics.uploader.max_retries']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_diagnostics.uploader.max_retries'] &&
                  validation['monitoring_diagnostics.uploader.max_retries']
              )}
            >
              <EuiFieldNumber
                disabled={disabled}
                placeholder="10"
                min={1}
                value={agentPolicy.monitoring_diagnostics?.uploader?.max_retries}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_diagnostics: {
                      ...agentPolicy.monitoring_diagnostics,
                      uploader: {
                        ...agentPolicy.monitoring_diagnostics?.uploader,
                        max_retries: e.target.value ? Number(e.target.value) : undefined,
                      },
                    },
                  });
                }}
                onBlur={() =>
                  updateTouchedFields({ 'monitoring_diagnostics.uploader.max_retries': true })
                }
                isInvalid={Boolean(
                  touchedFields['monitoring_diagnostics.uploader.max_retries'] &&
                    validation['monitoring_diagnostics.uploader.max_retries']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.diagnosticsFileUpload.initialDurationFieldLabel"
                  defaultMessage="Initial duration"
                />
              }
              isDisabled={disabled}
              error={
                touchedFields['monitoring_diagnostics.uploader.init_dur'] &&
                validation['monitoring_diagnostics.uploader.init_dur']
                  ? validation['monitoring_diagnostics.uploader.init_dur']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_diagnostics.uploader.init_dur'] &&
                  validation['monitoring_diagnostics.uploader.init_dur']
              )}
            >
              <EuiFieldText
                disabled={disabled}
                placeholder="1s"
                value={agentPolicy.monitoring_diagnostics?.uploader?.init_dur}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_diagnostics: {
                      ...agentPolicy.monitoring_diagnostics,
                      uploader: {
                        ...agentPolicy.monitoring_diagnostics?.uploader,
                        init_dur: e.target.value ? e.target.value : undefined,
                      },
                    },
                  });
                }}
                onBlur={() =>
                  updateTouchedFields({ 'monitoring_diagnostics.uploader.init_dur': true })
                }
                isInvalid={Boolean(
                  touchedFields['monitoring_diagnostics.uploader.init_dur'] &&
                    validation['monitoring_diagnostics.uploader.init_dur']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.agentPolicyForm.diagnosticsFileUpload.maxDurationFieldLabel"
                  defaultMessage="Backoff duration"
                />
              }
              isDisabled={disabled}
              error={
                touchedFields['monitoring_diagnostics.uploader.max_dur'] &&
                validation['monitoring_diagnostics.uploader.max_dur']
                  ? validation['monitoring_diagnostics.uploader.max_dur']
                  : null
              }
              isInvalid={Boolean(
                touchedFields['monitoring_diagnostics.uploader.max_dur'] &&
                  validation['monitoring_diagnostics.uploader.max_dur']
              )}
            >
              <EuiFieldText
                disabled={disabled}
                placeholder="1m"
                value={agentPolicy.monitoring_diagnostics?.uploader?.max_dur}
                onChange={(e) => {
                  updateAgentPolicy({
                    monitoring_diagnostics: {
                      ...agentPolicy.monitoring_diagnostics,
                      uploader: {
                        ...agentPolicy.monitoring_diagnostics?.uploader,
                        max_dur: e.target.value ? e.target.value : undefined,
                      },
                    },
                  });
                }}
                onBlur={() =>
                  updateTouchedFields({ 'monitoring_diagnostics.uploader.max_dur': true })
                }
                isInvalid={Boolean(
                  touchedFields['monitoring_diagnostics.uploader.max_dur'] &&
                    validation['monitoring_diagnostics.uploader.max_dur']
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </PushedDescribedFormGroup>
    </StyledEuiAccordion>
  );
};
