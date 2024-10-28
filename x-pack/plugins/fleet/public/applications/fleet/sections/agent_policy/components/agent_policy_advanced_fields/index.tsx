/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, Suspense } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiIconTip,
  EuiCheckboxGroup,
  EuiLink,
  EuiFieldNumber,
  EuiFieldText,
  EuiSuperSelect,
  EuiToolTip,
  EuiRadioGroup,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MissingPrivilegesToolTip } from '../../../../../../components/missing_privileges_tooltip';

import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  dataTypes,
  DEFAULT_MAX_AGENT_POLICIES_WITH_INACTIVITY_TIMEOUT,
} from '../../../../../../../common/constants';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import {
  useStartServices,
  useConfig,
  useGetAgentPolicies,
  useLicense,
  useUIExtension,
  useLink,
  useFleetStatus,
  useAuthz,
} from '../../../../hooks';

import { AgentPolicyPackageBadge } from '../../../../components';
import { UninstallCommandFlyout } from '../../../../../../components';

import type { ValidationResults } from '../agent_policy_validation';

import { ExperimentalFeaturesService } from '../../../../services';
import { useAgentPolicyFormContext } from '../agent_policy_form';
import { policyHasEndpointSecurity as hasElasticDefend } from '../../../../../../../common/services';

import {
  useOutputOptions,
  useDownloadSourcesOptions,
  DEFAULT_SELECT_VALUE,
  useFleetServerHostsOptions,
} from './hooks';
import { CustomFields } from './custom_fields';
import { SpaceSelector } from './space_selector';
import { AgentPolicyAdvancedMonitoringOptions } from './advanced_monitoring';

interface Props {
  agentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  allowedNamespacePrefixes?: string[];
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  validation: ValidationResults;
  disabled?: boolean;
}

export const AgentPolicyAdvancedOptionsContent: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
  validation,
  disabled = false,
}) => {
  const { docLinks } = useStartServices();
  const { spaceId, isSpaceAwarenessEnabled } = useFleetStatus();

  const { getAbsolutePath } = useLink();
  const AgentTamperProtectionWrapper = useUIExtension(
    'endpoint',
    'endpoint-agent-tamper-protection'
  );
  const config = useConfig();
  const authz = useAuthz();
  const maxAgentPoliciesWithInactivityTimeout =
    config.developer?.maxAgentPoliciesWithInactivityTimeout ??
    DEFAULT_MAX_AGENT_POLICIES_WITH_INACTIVITY_TIMEOUT;
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});

  const {
    dataOutputOptions,
    monitoringOutputOptions,
    isLoading: isLoadingOptions,
  } = useOutputOptions(agentPolicy);

  const { data: agentPoliciesData } = useGetAgentPolicies({
    page: 1,
    perPage: 0,
    kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.inactivity_timeout:*`,
  });

  const totalAgentPoliciesWithInactivityTimeout = agentPoliciesData?.total ?? 0;
  const tooManyAgentPoliciesForInactivityTimeout =
    maxAgentPoliciesWithInactivityTimeout !== undefined &&
    totalAgentPoliciesWithInactivityTimeout > (maxAgentPoliciesWithInactivityTimeout ?? 0);
  const { dataDownloadSourceOptions, isLoading: isLoadingDownloadSources } =
    useDownloadSourcesOptions(agentPolicy);

  const { fleetServerHostsOptions, isLoading: isLoadingFleetServerHostsOption } =
    useFleetServerHostsOptions(agentPolicy);

  // agent monitoring checkbox group can appear multiple times in the DOM, ids have to be unique to work correctly
  const monitoringCheckboxIdSuffix = Date.now();

  const { agentTamperProtectionEnabled } = ExperimentalFeaturesService.get();
  const licenseService = useLicense();
  const [isUninstallCommandFlyoutOpen, setIsUninstallCommandFlyoutOpen] = useState(false);
  const policyHasElasticDefend = useMemo(() => hasElasticDefend(agentPolicy), [agentPolicy]);
  const isManagedorAgentlessPolicy =
    agentPolicy.is_managed === true || agentPolicy?.supports_agentless === true;

  const agentPolicyFormContect = useAgentPolicyFormContext();

  const AgentTamperProtectionSectionContent = useMemo(
    () => (
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.tamperingLabel"
              defaultMessage="Agent tamper protection"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.tamperingDescription"
            defaultMessage="Prevent agents from being uninstalled locally. When enabled, agents can only be uninstalled using an authorization token in the uninstall command. Click { linkName } for the full command."
            values={{ linkName: <strong>Get uninstall command</strong> }}
          />
        }
      >
        <EuiSpacer size="l" />
        <EuiSwitch
          label={
            <>
              <FormattedMessage
                id="xpack.fleet.agentPolicyForm.tamperingSwitchLabel"
                defaultMessage="Prevent agent tampering"
              />{' '}
              {!policyHasElasticDefend && (
                <span data-test-subj="tamperMissingIntegrationTooltip">
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content={i18n.translate(
                      'xpack.fleet.agentPolicyForm.tamperingSwitchLabel.disabledWarning',
                      {
                        defaultMessage:
                          'Elastic Defend integration is required to enable this feature',
                      }
                    )}
                  />
                </span>
              )}
            </>
          }
          checked={agentPolicy.is_protected ?? false}
          onChange={(e) => {
            updateAgentPolicy({ is_protected: e.target.checked });
          }}
          disabled={disabled || !policyHasElasticDefend}
          data-test-subj="tamperProtectionSwitch"
        />
        {agentPolicy.id && (
          <>
            <EuiSpacer size="s" />
            <MissingPrivilegesToolTip
              missingPrivilege={
                policyHasElasticDefend && agentPolicy.is_protected && !authz.fleet.allAgents
                  ? 'Agents All'
                  : undefined
              }
              position="left"
            >
              <EuiLink
                onClick={() => {
                  setIsUninstallCommandFlyoutOpen(true);
                }}
                disabled={
                  !agentPolicy.is_protected || !policyHasElasticDefend || !authz.fleet.allAgents
                }
                data-test-subj="uninstallCommandLink"
              >
                {i18n.translate('xpack.fleet.agentPolicyForm.tamperingUninstallLink', {
                  defaultMessage: 'Get uninstall command',
                })}
              </EuiLink>
            </MissingPrivilegesToolTip>
          </>
        )}
      </EuiDescribedFormGroup>
    ),
    [
      agentPolicy.id,
      agentPolicy.is_protected,
      policyHasElasticDefend,
      updateAgentPolicy,
      disabled,
      authz.fleet.allAgents,
    ]
  );

  const AgentTamperProtectionSection = useMemo(() => {
    if (
      agentTamperProtectionEnabled &&
      licenseService.isPlatinum() &&
      !agentPolicy.is_managed &&
      !agentPolicy.supports_agentless
    ) {
      if (AgentTamperProtectionWrapper) {
        return (
          <Suspense fallback={null}>
            <AgentTamperProtectionWrapper.Component>
              {AgentTamperProtectionSectionContent}
            </AgentTamperProtectionWrapper.Component>
          </Suspense>
        );
      }
      return AgentTamperProtectionSectionContent;
    }
  }, [
    agentTamperProtectionEnabled,
    licenseService,
    agentPolicy.is_managed,
    AgentTamperProtectionWrapper,
    AgentTamperProtectionSectionContent,
    agentPolicy.supports_agentless,
  ]);

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.descriptionFieldLabel"
              defaultMessage="Description"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.descriptionDescription"
            defaultMessage="Add a description of how this policy will be used."
          />
        }
      >
        {isUninstallCommandFlyoutOpen && agentPolicy.id && (
          <UninstallCommandFlyout
            target="agent"
            policyId={agentPolicy.id}
            onClose={() => setIsUninstallCommandFlyoutOpen(false)}
          />
        )}
        <EuiFormRow
          fullWidth
          key="description"
          error={
            touchedFields.description && validation.description ? validation.description : null
          }
          isDisabled={disabled}
          isInvalid={Boolean(touchedFields.description && validation.description)}
        >
          <EuiFieldText
            disabled={disabled || agentPolicy.is_managed === true}
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
      {isSpaceAwarenessEnabled ? (
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              <FormattedMessage
                id="xpack.fleet.agentPolicyForm.spaceFieldLabel"
                defaultMessage="Spaces"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.spaceDescription"
              defaultMessage="Select one or more spaces for this policy or create a new one. {link}"
              values={{
                link: (
                  <EuiLink
                    target="_blank"
                    href={getAbsolutePath('/app/management/kibana/spaces/create')}
                    external
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyForm.createSpaceLink"
                      defaultMessage="Create space"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
        >
          <SpaceSelector
            isDisabled={disabled}
            value={
              'space_ids' in agentPolicy && agentPolicy.space_ids
                ? agentPolicy.space_ids
                : [spaceId || 'default']
            }
            setInvalidSpaceError={agentPolicyFormContect?.setInvalidSpaceError}
            onChange={(newValue) => {
              if (newValue.length === 0) {
                return;
              }
              updateAgentPolicy({
                space_ids: newValue,
              });
            }}
          />
        </EuiDescribedFormGroup>
      ) : null}
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3 data-test-subj="defaultNamespaceHeader">
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.namespaceFieldLabel"
              defaultMessage="Default namespace"
            />
          </h3>
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
          isDisabled={disabled}
        >
          <EuiComboBox
            fullWidth
            singleSelection
            noSuggestions
            isDisabled={disabled}
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
      <CustomFields
        updateAgentPolicy={updateAgentPolicy}
        agentPolicy={agentPolicy}
        isDisabled={disabled || agentPolicy.is_managed === true}
      />
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.monitoringLabel"
              defaultMessage="Agent monitoring"
            />
          </h3>
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
        <EuiSpacer size="l" />
        <EuiCheckboxGroup
          disabled={disabled || isManagedorAgentlessPolicy}
          options={[
            {
              id: `${dataTypes.Logs}_${monitoringCheckboxIdSuffix}`,
              'data-test-subj': 'collectLogsCheckbox',
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
              'data-test-subj': 'collectMetricsCheckbox',
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

      <AgentPolicyAdvancedMonitoringOptions
        agentPolicy={agentPolicy}
        disabled={disabled || agentPolicy.is_managed === true}
        validation={validation}
        touchedFields={touchedFields}
        updateTouchedFields={(fields) => setTouchedFields({ ...touchedFields, ...fields })}
        updateAgentPolicy={updateAgentPolicy}
      />
      <EuiSpacer size="l" />

      {AgentTamperProtectionSection}

      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.inactivityTimeoutLabel"
              defaultMessage="Inactivity timeout"
            />
            {tooManyAgentPoliciesForInactivityTimeout && (
              <>
                &nbsp;
                <EuiToolTip
                  content={
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyForm.inactivityTimeoutTooltip"
                      defaultMessage="The maximum of 750 agent policies with an inactivity timeout has been exceeded. Remove inactivity timeouts or agent policies to allow agents to become inactive again."
                    />
                  }
                >
                  <EuiBadge color="warning">
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyForm.inactivityTimeoutBadge"
                      defaultMessage="Warning"
                    />
                  </EuiBadge>
                </EuiToolTip>
              </>
            )}
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.inactivityTimeoutDescription"
            defaultMessage="An optional timeout in seconds. If provided, an agent will automatically change to inactive status and be filtered out of the agents list. A maximum of 750 agent policies can have an inactivity timeout."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.inactivity_timeout && validation.inactivity_timeout
              ? validation.inactivity_timeout
              : null
          }
          isInvalid={Boolean(touchedFields.inactivity_timeout && validation.inactivity_timeout)}
          isDisabled={disabled}
        >
          <EuiFieldNumber
            fullWidth
            disabled={disabled || isManagedorAgentlessPolicy}
            value={agentPolicy.inactivity_timeout || ''}
            min={0}
            onChange={(e) => {
              updateAgentPolicy({
                inactivity_timeout: e.target.value ? Number(e.target.value) : 0,
              });
            }}
            isInvalid={Boolean(touchedFields.inactivity_timeout && validation.inactivity_timeout)}
            onBlur={() => setTouchedFields({ ...touchedFields, inactivity_timeout: true })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.fleetServerHostsLabel"
              defaultMessage="Fleet Server"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.fleetServerHostsDescripton"
            defaultMessage="Select to which Fleet Server the agents in this policy will communicate."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.fleet_server_host_id && validation.fleet_server_host_id
              ? validation.fleet_server_host_id
              : null
          }
          isDisabled={disabled}
          isInvalid={Boolean(touchedFields.fleet_server_host_id && validation.fleet_server_host_id)}
        >
          <EuiSuperSelect
            disabled={disabled || isManagedorAgentlessPolicy}
            valueOfSelected={agentPolicy.fleet_server_host_id || DEFAULT_SELECT_VALUE}
            fullWidth
            isLoading={isLoadingFleetServerHostsOption}
            onChange={(e) => {
              updateAgentPolicy({
                fleet_server_host_id: e !== DEFAULT_SELECT_VALUE ? e : null,
              });
            }}
            options={fleetServerHostsOptions}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.dataOutputLabel"
              defaultMessage="Output for integrations"
            />
          </h3>
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
          isDisabled={disabled}
        >
          <EuiSuperSelect
            disabled={disabled || isManagedorAgentlessPolicy}
            valueOfSelected={agentPolicy.data_output_id || DEFAULT_SELECT_VALUE}
            fullWidth
            isLoading={isLoadingOptions}
            onChange={(e) => {
              updateAgentPolicy({
                data_output_id: e !== DEFAULT_SELECT_VALUE ? e : null,
              });
            }}
            options={dataOutputOptions}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.monitoringOutputLabel"
              defaultMessage="Output for agent monitoring"
            />
          </h3>
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
          isDisabled={disabled}
        >
          <EuiSuperSelect
            disabled={disabled || isManagedorAgentlessPolicy}
            valueOfSelected={agentPolicy.monitoring_output_id || DEFAULT_SELECT_VALUE}
            fullWidth
            isLoading={isLoadingOptions}
            onChange={(e) => {
              updateAgentPolicy({
                monitoring_output_id: e !== DEFAULT_SELECT_VALUE ? e : null,
              });
            }}
            options={monitoringOutputOptions}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.downloadSourceLabel"
              defaultMessage="Agent binary download"
              data-test-subj="agentPolicyForm.downloadSource.label"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.downloadSourceDescription"
            defaultMessage="When an upgrade action is issued the agents will download the binary from this location."
          />
        }
      >
        <EuiFormRow
          fullWidth
          error={
            touchedFields.download_source_id && validation.download_source_id
              ? validation.download_source_id
              : null
          }
          isInvalid={Boolean(touchedFields.download_source_id && validation.download_source_id)}
          isDisabled={disabled}
        >
          <EuiSuperSelect
            disabled={disabled || agentPolicy?.supports_agentless === true}
            valueOfSelected={agentPolicy.download_source_id || DEFAULT_SELECT_VALUE}
            fullWidth
            isLoading={isLoadingDownloadSources}
            onChange={(e) => {
              updateAgentPolicy({
                download_source_id: e !== DEFAULT_SELECT_VALUE ? e : null,
              });
            }}
            options={dataDownloadSourceOptions}
            data-test-subj="agentPolicyForm.downloadSource.select"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.hostnameFormatLabel"
              defaultMessage="Host name format"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.hostnameFormatLabelDescription"
            defaultMessage="Select how you would like agent domain names to be displayed."
          />
        }
      >
        <EuiFormRow fullWidth isDisabled={disabled}>
          <EuiRadioGroup
            disabled={disabled || agentPolicy?.supports_agentless === true}
            options={[
              {
                id: 'hostname',
                label: (
                  <>
                    <EuiFlexGroup gutterSize="xs" direction="column">
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <b>
                            <FormattedMessage
                              id="xpack.fleet.agentPolicyForm.hostnameFormatOptionHostname"
                              defaultMessage="Hostname"
                            />
                          </b>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s" color="subdued">
                          <FormattedMessage
                            id="xpack.fleet.agentPolicyForm.hostnameFormatOptionHostnameExample"
                            defaultMessage="ex: My-Laptop"
                          />
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                  </>
                ),
              },
              {
                id: 'fqdn',
                label: (
                  <EuiFlexGroup gutterSize="xs" direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <b>
                          <FormattedMessage
                            id="xpack.fleet.agentPolicyForm.hostnameFormatOptionFqdn"
                            defaultMessage="Fully Qualified Domain Name (FQDN)"
                          />
                        </b>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        <FormattedMessage
                          id="xpack.fleet.agentPolicyForm.hostnameFormatOptionFqdnExample"
                          defaultMessage="ex: My-Laptop.admin.acme.co"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
              },
            ]}
            idSelected={agentPolicy.agent_features?.length ? 'fqdn' : 'hostname'}
            onChange={(id: string) => {
              updateAgentPolicy({
                agent_features: id === 'hostname' ? [] : [{ name: 'fqdn', enabled: true }],
              });
            }}
            name="radio group"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.agentPolicyForm.unenrollmentTimeoutLabel"
              defaultMessage="Inactive agent unenrollment timeout"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.unenrollmentTimeoutDescription"
            defaultMessage="An optional timeout in seconds. If configured, inactive agents will be automatically unenrolled and their API keys will be invalidated after they've been inactive for this value in seconds. This can be useful for policies containing ephemeral agents, such as those in a Docker or Kubernetes environment."
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
          isDisabled={disabled}
        >
          <EuiFieldNumber
            fullWidth
            disabled={disabled || isManagedorAgentlessPolicy}
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
      <EuiSpacer size="l" />
    </>
  );
};
