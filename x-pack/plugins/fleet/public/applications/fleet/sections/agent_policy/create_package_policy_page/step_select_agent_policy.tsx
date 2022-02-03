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
import type { EuiSelectOption } from '@elastic/eui';
import { EuiSelect } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { Error } from '../../../components';
import type { AgentPolicy, PackageInfo, GetAgentPoliciesResponseItem } from '../../../types';
import { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from '../../../services';
import { useGetAgentPolicies, sendGetOneAgentPolicy, useFleetStatus } from '../../../hooks';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

export const StepSelectAgentPolicy: React.FunctionComponent<{
  packageInfo?: PackageInfo;
  agentPolicy: AgentPolicy | undefined;
  updateAgentPolicy: (agentPolicy: AgentPolicy | undefined) => void;
  setHasAgentPolicyError: (hasError: boolean) => void;
  selectedAgentPolicyId?: string;
}> = ({
  packageInfo,
  agentPolicy,
  updateAgentPolicy,
  setHasAgentPolicyError,
  selectedAgentPolicyId,
}) => {
  const { isReady: isFleetReady } = useFleetStatus();

  const [selectedAgentPolicyError, setSelectedAgentPolicyError] = useState<Error>();

  // Fetch agent policies info
  const {
    data: agentPoliciesData,
    error: agentPoliciesError,
    isLoading: isAgentPoliciesLoading,
  } = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
    sortField: 'name',
    sortOrder: 'asc',
    full: true,
  });
  const agentPolicies = useMemo(
    () => agentPoliciesData?.items.filter((policy) => !policy.is_managed) || [],
    [agentPoliciesData?.items]
  );

  const agentPoliciesById = useMemo(() => {
    return agentPolicies.reduce((acc: { [key: string]: GetAgentPoliciesResponseItem }, policy) => {
      acc[policy.id] = policy;
      return acc;
    }, {});
  }, [agentPolicies]);

  // Selected agent policy state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    agentPolicy?.id ??
      (selectedAgentPolicyId || (agentPolicies.length === 1 ? agentPolicies[0].id : undefined))
  );

  const doesAgentPolicyHaveLimitedPackage = useCallback(
    (policy: AgentPolicy, pkgInfo: PackageInfo) => {
      return policy
        ? isPackageLimited(pkgInfo) && doesAgentPolicyAlreadyIncludePackage(policy, pkgInfo.name)
        : false;
    },
    []
  );

  // Update parent selected agent policy state
  useEffect(() => {
    const fetchAgentPolicyInfo = async () => {
      if (selectedPolicyId) {
        const { data, error } = await sendGetOneAgentPolicy(selectedPolicyId);
        if (error) {
          setSelectedAgentPolicyError(error);
          updateAgentPolicy(undefined);
        } else if (data && data.item) {
          setSelectedAgentPolicyError(undefined);
          updateAgentPolicy(data.item);
        }
      } else {
        setSelectedAgentPolicyError(undefined);
        updateAgentPolicy(undefined);
      }
    };
    if (!agentPolicy || selectedPolicyId !== agentPolicy.id) {
      fetchAgentPolicyInfo();
    }
  }, [selectedPolicyId, agentPolicy, updateAgentPolicy]);

  const agentPolicyOptions: EuiSelectOption[] = useMemo(
    () =>
      packageInfo
        ? agentPolicies.map((agentConf) => {
            return {
              text: agentConf.name,
              value: agentConf.id,
              disabled: doesAgentPolicyHaveLimitedPackage(agentConf, packageInfo),
              'data-test-subj': 'agentPolicyItem',
            };
          })
        : [],
    [agentPolicies, doesAgentPolicyHaveLimitedPackage, packageInfo]
  );

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
                isFleetReady && selectedPolicyId ? (
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsDescriptionText"
                    defaultMessage="{count, plural, one {# agent is} other {# agents are}} enrolled with the selected agent policy."
                    values={{
                      count: agentPoliciesById[selectedPolicyId]?.agents ?? 0,
                    }}
                  />
                ) : null
              }
              isInvalid={Boolean(
                !selectedPolicyId ||
                  !packageInfo ||
                  doesAgentPolicyHaveLimitedPackage(
                    agentPoliciesById[selectedPolicyId],
                    packageInfo
                  )
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
              <EuiSelect
                placeholder={i18n.translate(
                  'xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyPlaceholderText',
                  {
                    defaultMessage: 'Select an agent policy to add this integration to',
                  }
                )}
                hasNoInitialSelection={agentPolicies.length > 1}
                fullWidth
                isLoading={isAgentPoliciesLoading || !packageInfo}
                options={agentPolicyOptions}
                value={selectedPolicyId || undefined}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
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
