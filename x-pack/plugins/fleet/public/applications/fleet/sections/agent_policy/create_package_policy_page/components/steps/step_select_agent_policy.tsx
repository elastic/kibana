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
import type { EuiSuperSelectOption } from '@elastic/eui';
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
import { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from '../../../../../services';
import {
  useGetAgentPolicies,
  useGetOutputs,
  sendGetOneAgentPolicy,
  useFleetStatus,
  useGetPackagePolicies,
} from '../../../../../hooks';
import {
  FLEET_APM_PACKAGE,
  SO_SEARCH_LIMIT,
  outputType,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../../common/constants';

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
                          defaultMessage="Logstash output for agent integration is not supported with APM"
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

  return {
    agentPoliciesError,
    isLoading: isOutputLoading || isAgentPoliciesLoading || isLoadingPackagePolicies,
    agentPolicyOptions,
    agentPolicies,
  };
}

function doesAgentPolicyHaveLimitedPackage(policy: AgentPolicy, pkgInfo: PackageInfo) {
  return policy
    ? isPackageLimited(pkgInfo) && doesAgentPolicyAlreadyIncludePackage(policy, pkgInfo.name)
    : false;
}

export const StepSelectAgentPolicy: React.FunctionComponent<{
  packageInfo?: PackageInfo;
  agentPolicy: AgentPolicy | undefined;
  updateAgentPolicy: (agentPolicy: AgentPolicy | undefined) => void;
  setHasAgentPolicyError: (hasError: boolean) => void;
  selectedAgentPolicyId?: string;
}> = ({
  packageInfo,
  agentPolicy,
  updateAgentPolicy: updateSelectedAgentPolicy,
  setHasAgentPolicyError,
  selectedAgentPolicyId,
}) => {
  const { isReady: isFleetReady } = useFleetStatus();

  const [selectedAgentPolicyError, setSelectedAgentPolicyError] = useState<Error>();

  const { isLoading, agentPoliciesError, agentPolicyOptions, agentPolicies } =
    useAgentPoliciesOptions(packageInfo);
  // Selected agent policy state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    agentPolicy?.id ??
      (selectedAgentPolicyId || (agentPolicies.length === 1 ? agentPolicies[0].id : undefined))
  );

  const [isLoadingSelectedAgentPolicy, setIsLoadingSelectedAgentPolicy] = useState<boolean>(false);
  const [selectedAgentPolicy, setSelectedAgentPolicy] = useState<AgentPolicy | undefined>(
    agentPolicy
  );

  const updateAgentPolicy = useCallback(
    (selectedPolicy: AgentPolicy | undefined) => {
      setSelectedAgentPolicy(selectedPolicy);
      updateSelectedAgentPolicy(selectedPolicy);
    },
    [updateSelectedAgentPolicy]
  );
  // Update parent selected agent policy state
  useEffect(() => {
    const fetchAgentPolicyInfo = async () => {
      if (selectedPolicyId) {
        setIsLoadingSelectedAgentPolicy(true);
        const { data, error } = await sendGetOneAgentPolicy(selectedPolicyId);
        if (error) {
          setSelectedAgentPolicyError(error);
          updateAgentPolicy(undefined);
        } else if (data && data.item) {
          setSelectedAgentPolicyError(undefined);
          updateAgentPolicy(data.item);
        }
        setIsLoadingSelectedAgentPolicy(false);
      } else {
        setSelectedAgentPolicyError(undefined);
        updateAgentPolicy(undefined);
      }
    };
    if (!agentPolicy || selectedPolicyId !== agentPolicy.id) {
      fetchAgentPolicyInfo();
    }
  }, [selectedPolicyId, agentPolicy, updateAgentPolicy]);

  // Try to select default agent policy
  useEffect(() => {
    if (!selectedPolicyId && agentPolicies.length && agentPolicyOptions.length) {
      const enabledOptions = agentPolicyOptions.filter((option) => !option.disabled);
      if (enabledOptions.length === 1) {
        setSelectedPolicyId(enabledOptions[0].value as string | undefined);
      }
    }
  }, [agentPolicies, agentPolicyOptions, selectedPolicyId]);

  // Bubble up any issues with agent policy selection
  useEffect(() => {
    if (selectedPolicyId && !selectedAgentPolicyError) {
      setHasAgentPolicyError(false);
    } else setHasAgentPolicyError(true);
  }, [selectedAgentPolicyError, selectedPolicyId, setHasAgentPolicyError]);

  const onChange = useCallback(
    (newValue: string) => setSelectedPolicyId(newValue === '' ? undefined : newValue),
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
              fullWidth
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
                isFleetReady && selectedPolicyId && !isLoadingSelectedAgentPolicy ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsDescriptionText"
                    defaultMessage="{count, plural, one {# agent is} other {# agents are}} enrolled with the selected agent policy."
                    values={{
                      count: selectedAgentPolicy?.agents ?? 0,
                    }}
                  />
                ) : null
              }
              isInvalid={Boolean(
                !selectedPolicyId ||
                  !packageInfo ||
                  (selectedAgentPolicy &&
                    doesAgentPolicyHaveLimitedPackage(selectedAgentPolicy, packageInfo))
              )}
              error={
                !selectedPolicyId ? (
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
                valueOfSelected={selectedPolicyId}
                onChange={onChange}
                data-test-subj="agentPolicySelect"
                aria-label="Select Agent Policy"
              />
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
