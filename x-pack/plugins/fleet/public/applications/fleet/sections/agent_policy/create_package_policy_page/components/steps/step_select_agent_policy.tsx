/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { EuiSuperSelect } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { Error } from '../../../../../components';
import type { AgentPolicy, Output, PackageInfo } from '../../../../../types';
import {
  isPackageLimited,
  doesAgentPolicyAlreadyIncludePackage,
  ExperimentalFeaturesService,
} from '../../../../../services';
import {
  useGetAgentPolicies,
  useGetOutputs,
  useFleetStatus,
  useGetPackagePolicies,
  sendBulkGetAgentPolicies,
} from '../../../../../hooks';
import {
  FLEET_APM_PACKAGE,
  SO_SEARCH_LIMIT,
  outputType,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../../common/constants';

import { AgentPolicyMultiSelect } from './components/agent_policy_multi_select';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

function useAgentPoliciesOptions(packageInfo?: PackageInfo) {
  // Fetch agent policies info
  const {
    data: agentPoliciesData,
    error: agentPoliciesError,
    isLoading: isAgentPoliciesLoading,
  } = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    sortField: 'name',
    sortOrder: 'asc',
    noAgentCount: true, // agentPolicy.agents will always be 0
    full: false, // package_policies will always be empty
  });
  const agentPolicies = useMemo(
    () => agentPoliciesData?.items.filter((policy) => !policy.is_managed) || [],
    [agentPoliciesData?.items]
  );

  const { data: outputsData, isLoading: isOutputLoading } = useGetOutputs();

  // get all package policies with apm integration or the current integration
  const { data: packagePoliciesForThisPackage, isLoading: isLoadingPackagePolicies } =
    useGetPackagePolicies({
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${packageInfo?.name}`,
    });

  const packagePoliciesForThisPackageByAgentPolicyId = useMemo(
    () =>
      packagePoliciesForThisPackage?.items.reduce(
        (acc: { [key: string]: boolean }, packagePolicy) => {
          packagePolicy.policy_ids.forEach((policyId) => {
            acc[policyId] = true;
          });
          return acc;
        },
        {}
      ),
    [packagePoliciesForThisPackage?.items]
  );

  const { getDataOutputForPolicy } = useMemo(() => {
    const defaultOutput = (outputsData?.items ?? []).find((output) => output.is_default);
    const outputsById = (outputsData?.items ?? []).reduce(
      (acc: { [key: string]: Output }, output) => {
        acc[output.id] = output;
        return acc;
      },
      {}
    );

    return {
      getDataOutputForPolicy: (policy: Pick<AgentPolicy, 'data_output_id'>) => {
        return policy.data_output_id ? outputsById[policy.data_output_id] : defaultOutput;
      },
    };
  }, [outputsData]);

  const agentPolicyOptions: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      packageInfo
        ? agentPolicies.map((policy) => {
            const isLimitedPackageAlreadyInPolicy =
              isPackageLimited(packageInfo) &&
              packagePoliciesForThisPackageByAgentPolicyId?.[policy.id];

            const isAPMPackageAndDataOutputIsLogstash =
              packageInfo?.name === FLEET_APM_PACKAGE &&
              getDataOutputForPolicy(policy)?.type === outputType.Logstash;

            return {
              inputDisplay: (
                <>
                  <EuiText size="s">{policy.name}</EuiText>
                  {isAPMPackageAndDataOutputIsLogstash && (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyDisabledAPMLogstashOuputText"
                          defaultMessage="Logstash output for integrations is not supported with APM"
                        />
                      </EuiText>
                    </>
                  )}
                </>
              ),
              value: policy.id,
              disabled: isLimitedPackageAlreadyInPolicy || isAPMPackageAndDataOutputIsLogstash,
              'data-test-subj': 'agentPolicyItem',
            };
          })
        : [],
    [
      packageInfo,
      agentPolicies,
      packagePoliciesForThisPackageByAgentPolicyId,
      getDataOutputForPolicy,
    ]
  );

  const agentPolicyMultiOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      packageInfo && !isOutputLoading && !isAgentPoliciesLoading && !isLoadingPackagePolicies
        ? agentPolicies.map((policy) => {
            const isLimitedPackageAlreadyInPolicy =
              isPackageLimited(packageInfo) &&
              packagePoliciesForThisPackageByAgentPolicyId?.[policy.id];

            const isAPMPackageAndDataOutputIsLogstash =
              packageInfo?.name === FLEET_APM_PACKAGE &&
              getDataOutputForPolicy(policy)?.type === outputType.Logstash;

            return {
              append: isAPMPackageAndDataOutputIsLogstash ? (
                <EuiToolTip
                  content={
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyDisabledAPMLogstashOuputText"
                      defaultMessage="Logstash output for integrations is not supported with APM"
                    />
                  }
                >
                  <EuiIcon size="s" type="warningFilled" />
                </EuiToolTip>
              ) : null,
              key: policy.id,
              label: policy.name,
              disabled: isLimitedPackageAlreadyInPolicy || isAPMPackageAndDataOutputIsLogstash,
              'data-test-subj': 'agentPolicyMultiItem',
            };
          })
        : [],
    [
      packageInfo,
      agentPolicies,
      packagePoliciesForThisPackageByAgentPolicyId,
      getDataOutputForPolicy,
      isOutputLoading,
      isAgentPoliciesLoading,
      isLoadingPackagePolicies,
    ]
  );

  return {
    agentPoliciesError,
    isLoading: isOutputLoading || isAgentPoliciesLoading || isLoadingPackagePolicies,
    agentPolicyOptions,
    agentPolicies,
    agentPolicyMultiOptions,
  };
}

function doesAgentPolicyHaveLimitedPackage(policy: AgentPolicy, pkgInfo: PackageInfo) {
  return policy
    ? isPackageLimited(pkgInfo) && doesAgentPolicyAlreadyIncludePackage(policy, pkgInfo.name)
    : false;
}

export const StepSelectAgentPolicy: React.FunctionComponent<{
  packageInfo?: PackageInfo;
  agentPolicies: AgentPolicy[];
  updateAgentPolicies: (agentPolicies: AgentPolicy[]) => void;
  setHasAgentPolicyError: (hasError: boolean) => void;
  selectedAgentPolicyId?: string;
}> = ({
  packageInfo,
  agentPolicies,
  updateAgentPolicies: updateSelectedAgentPolicies,
  setHasAgentPolicyError,
  selectedAgentPolicyId,
}) => {
  const { isReady: isFleetReady } = useFleetStatus();

  const [selectedAgentPolicyError, setSelectedAgentPolicyError] = useState<Error>();

  const { enableReusableIntegrationPolicies } = ExperimentalFeaturesService.get();

  const {
    isLoading,
    agentPoliciesError,
    agentPolicyOptions,
    agentPolicyMultiOptions,
    agentPolicies: existingAgentPolicies,
  } = useAgentPoliciesOptions(packageInfo);

  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

  const [isLoadingSelectedAgentPolicy, setIsLoadingSelectedAgentPolicy] = useState<boolean>(false);
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<AgentPolicy[]>(agentPolicies);

  const updateAgentPolicies = useCallback(
    (selectedPolicies: AgentPolicy[]) => {
      setSelectedAgentPolicies(selectedPolicies);
      updateSelectedAgentPolicies(selectedPolicies);
    },
    [updateSelectedAgentPolicies]
  );
  // Update parent selected agent policy state
  useEffect(() => {
    const fetchAgentPolicyInfo = async () => {
      if (selectedPolicyIds.length > 0) {
        setIsLoadingSelectedAgentPolicy(true);
        const { data, error } = await sendBulkGetAgentPolicies(selectedPolicyIds, { full: true });
        if (error) {
          setSelectedAgentPolicyError(error);
          updateAgentPolicies([]);
        } else if (data && data.items) {
          setSelectedAgentPolicyError(undefined);
          updateAgentPolicies(data.items);
        }
        setIsLoadingSelectedAgentPolicy(false);
      } else {
        setSelectedAgentPolicyError(undefined);
        updateAgentPolicies([]);
      }
    };
    const agentPoliciesHaveAllSelectedIds = selectedPolicyIds.every((id) =>
      agentPolicies.map((policy) => policy.id).includes(id)
    );
    if (agentPolicies.length === 0 || !agentPoliciesHaveAllSelectedIds) {
      fetchAgentPolicyInfo();
    } else if (agentPoliciesHaveAllSelectedIds && selectedPolicyIds.length < agentPolicies.length) {
      setSelectedAgentPolicyError(undefined);
      updateAgentPolicies(agentPolicies.filter((policy) => selectedPolicyIds.includes(policy.id)));
    }
  }, [selectedPolicyIds, agentPolicies, updateAgentPolicies]);

  // Try to select default agent policy
  useEffect(() => {
    if (
      selectedPolicyIds.length === 0 &&
      existingAgentPolicies.length &&
      (enableReusableIntegrationPolicies
        ? agentPolicyMultiOptions.length
        : agentPolicyOptions.length)
    ) {
      if (enableReusableIntegrationPolicies) {
        const enabledOptions = agentPolicyMultiOptions.filter((option) => !option.disabled);
        if (enabledOptions.length === 1) {
          setSelectedPolicyIds([enabledOptions[0].key!]);
        } else if (selectedAgentPolicyId) {
          setSelectedPolicyIds([selectedAgentPolicyId]);
        }
      } else {
        const enabledOptions = agentPolicyOptions.filter((option) => !option.disabled);
        if (enabledOptions.length === 1) {
          setSelectedPolicyIds([enabledOptions[0].value]);
        } else if (selectedAgentPolicyId) {
          setSelectedPolicyIds([selectedAgentPolicyId]);
        }
      }
    }
  }, [
    agentPolicyOptions,
    agentPolicyMultiOptions,
    enableReusableIntegrationPolicies,
    selectedAgentPolicyId,
    selectedPolicyIds,
    existingAgentPolicies,
  ]);

  // Bubble up any issues with agent policy selection
  useEffect(() => {
    if (selectedPolicyIds.length > 0 && !selectedAgentPolicyError) {
      setHasAgentPolicyError(false);
    } else setHasAgentPolicyError(true);
  }, [selectedAgentPolicyError, selectedPolicyIds, setHasAgentPolicyError]);

  const onChange = useCallback(
    (newValue: string) => setSelectedPolicyIds(newValue === '' ? [] : [newValue]),
    []
  );

  // Display agent policies list error if there is one
  if (agentPoliciesError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingAgentPoliciesTitle"
            defaultMessage="Error loading agent policies"
          />
        }
        error={agentPoliciesError}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyFormGroupTitle"
                    defaultMessage="Agent policy"
                  />
                </h3>
              </EuiTitle>
            }
            description={
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyFormGroupDescription"
                    defaultMessage="Agent policies are used to manage a group of integrations across a set of agents."
                  />
                </p>
              </EuiText>
            }
          >
            <AgentPolicyFormRow
              fullWidth={true}
              label={
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyLabel"
                      defaultMessage="Agent policy"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              helpText={
                isFleetReady && selectedPolicyIds.length > 0 && !isLoadingSelectedAgentPolicy ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsDescriptionText"
                    defaultMessage="{count, plural, one {# agent is} other {# agents are}} enrolled with the selected agent policies."
                    values={{
                      count: selectedAgentPolicies.reduce(
                        (acc, curr) => acc + (curr.agents ?? 0),
                        0
                      ),
                    }}
                  />
                ) : null
              }
              isInvalid={Boolean(
                selectedPolicyIds.length === 0 ||
                  !packageInfo ||
                  selectedAgentPolicies.every((selectedAgentPolicy) =>
                    doesAgentPolicyHaveLimitedPackage(selectedAgentPolicy, packageInfo)
                  )
              )}
              error={
                selectedPolicyIds.length === 0 ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.noPolicySelectedError"
                    defaultMessage="An agent policy is required."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.cannotAddLimitedIntegrationError"
                    defaultMessage="This integration can only be added once per agent policy."
                  />
                )
              }
            >
              {enableReusableIntegrationPolicies ? (
                <AgentPolicyMultiSelect
                  isLoading={isLoading || !packageInfo || isLoadingSelectedAgentPolicy}
                  selectedPolicyIds={selectedPolicyIds}
                  setSelectedPolicyIds={setSelectedPolicyIds}
                  agentPolicyMultiOptions={agentPolicyMultiOptions}
                />
              ) : (
                <EuiSuperSelect
                  placeholder={i18n.translate(
                    'xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyPlaceholderText',
                    {
                      defaultMessage: 'Select an agent policy to add this integration to',
                    }
                  )}
                  fullWidth
                  isLoading={isLoading || !packageInfo || isLoadingSelectedAgentPolicy}
                  options={agentPolicyOptions}
                  valueOfSelected={selectedPolicyIds[0]}
                  onChange={onChange}
                  data-test-subj="agentPolicySelect"
                  aria-label="Select Agent Policy"
                />
              )}
            </AgentPolicyFormRow>
          </EuiDescribedFormGroup>
        </EuiFlexItem>
        {/* Display selected agent policy error if there is one */}
        {selectedAgentPolicyError ? (
          <EuiFlexItem>
            <Error
              title={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingSelectedAgentPolicyTitle"
                  defaultMessage="Error loading selected agent policy"
                />
              }
              error={selectedAgentPolicyError}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
