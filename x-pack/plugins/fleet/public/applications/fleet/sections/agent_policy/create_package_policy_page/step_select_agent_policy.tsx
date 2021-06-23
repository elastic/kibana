/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiPortal,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { Error } from '../../../components';
import type { AgentPolicy, PackageInfo, GetAgentPoliciesResponseItem } from '../../../types';
import { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from '../../../services';
import {
  useGetPackageInfoByKey,
  useGetAgentPolicies,
  sendGetOneAgentPolicy,
  useCapabilities,
  useFleetStatus,
} from '../../../hooks';
import { CreateAgentPolicyFlyout } from '../list_page/components';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

export const StepSelectAgentPolicy: React.FunctionComponent<{
  pkgkey: string;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  defaultAgentPolicyId?: string;
  agentPolicy: AgentPolicy | undefined;
  updateAgentPolicy: (agentPolicy: AgentPolicy | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({
  pkgkey,
  updatePackageInfo,
  agentPolicy,
  updateAgentPolicy,
  setIsLoadingSecondStep,
  defaultAgentPolicyId,
}) => {
  const { isReady: isFleetReady } = useFleetStatus();

  // Selected agent policy state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    agentPolicy?.id ?? defaultAgentPolicyId
  );
  const [selectedAgentPolicyError, setSelectedAgentPolicyError] = useState<Error>();

  // Create new agent policy flyout state
  const hasWriteCapabilites = useCapabilities().write;
  const [isCreateAgentPolicyFlyoutOpen, setIsCreateAgentPolicyFlyoutOpen] = useState<boolean>(
    false
  );

  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgkey);
  const isLimitedPackage = (packageInfoData && isPackageLimited(packageInfoData.response)) || false;

  // Fetch agent policies info
  const {
    data: agentPoliciesData,
    error: agentPoliciesError,
    isLoading: isAgentPoliciesLoading,
    resendRequest: refreshAgentPolicies,
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

  // Update parent package state
  useEffect(() => {
    if (packageInfoData && packageInfoData.response) {
      updatePackageInfo(packageInfoData.response);
    }
  }, [packageInfoData, updatePackageInfo]);

  // Update parent selected agent policy state
  useEffect(() => {
    const fetchAgentPolicyInfo = async () => {
      if (selectedPolicyId) {
        setIsLoadingSecondStep(true);
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
      setIsLoadingSecondStep(false);
    };
    if (!agentPolicy || selectedPolicyId !== agentPolicy.id) {
      fetchAgentPolicyInfo();
    }
  }, [selectedPolicyId, agentPolicy, updateAgentPolicy, setIsLoadingSecondStep]);

  const agentPolicyOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      packageInfoData
        ? agentPolicies.map((agentConf) => {
            const alreadyHasLimitedPackage =
              (isLimitedPackage &&
                doesAgentPolicyAlreadyIncludePackage(agentConf, packageInfoData.response.name)) ||
              false;
            return {
              label: agentConf.name,
              value: agentConf.id,
              disabled: alreadyHasLimitedPackage,
              'data-test-subj': 'agentPolicyItem',
            };
          })
        : [],
    [agentPolicies, isLimitedPackage, packageInfoData]
  );

  const selectedAgentPolicyOption = agentPolicyOptions.find(
    (option) => option.value === selectedPolicyId
  );

  // Try to select default agent policy
  useEffect(() => {
    if (!selectedPolicyId && agentPolicies.length && agentPolicyOptions.length) {
      const defaultAgentPolicy = agentPolicies.find((policy) => policy.is_default);
      if (defaultAgentPolicy) {
        const defaultAgentPolicyOption = agentPolicyOptions.find(
          (option) => option.value === defaultAgentPolicy.id
        );
        if (defaultAgentPolicyOption && !defaultAgentPolicyOption.disabled) {
          setSelectedPolicyId(defaultAgentPolicy.id);
        }
      }
    }
  }, [agentPolicies, agentPolicyOptions, selectedPolicyId]);

  // Display package error if there is one
  if (packageInfoError) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={packageInfoError}
      />
    );
  }

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
      {isCreateAgentPolicyFlyoutOpen ? (
        <EuiPortal>
          <CreateAgentPolicyFlyout
            onClose={(newAgentPolicy?: AgentPolicy) => {
              setIsCreateAgentPolicyFlyoutOpen(false);
              if (newAgentPolicy) {
                refreshAgentPolicies();
                setSelectedPolicyId(newAgentPolicy.id);
              }
            }}
            ownFocus={true}
          />
        </EuiPortal>
      ) : null}
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
                    defaultMessage="Agent policies are used to manage a group of integrations across a set of agents"
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
                  <EuiFlexItem grow={false}>
                    <div>
                      <EuiLink
                        disabled={!hasWriteCapabilites}
                        onClick={() => setIsCreateAgentPolicyFlyoutOpen(true)}
                      >
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.StepSelectPolicy.addButton"
                          defaultMessage="Create agent policy"
                        />
                      </EuiLink>
                    </div>
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
            >
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyPlaceholderText',
                  {
                    defaultMessage: 'Select an agent policy to add this integration to',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                fullWidth={true}
                isLoading={isAgentPoliciesLoading || isPackageInfoLoading}
                options={agentPolicyOptions}
                selectedOptions={selectedAgentPolicyOption ? [selectedAgentPolicyOption] : []}
                onChange={(options) => {
                  const selectedOption = options[0] || undefined;
                  if (selectedOption) {
                    if (selectedOption.value !== selectedPolicyId) {
                      setSelectedPolicyId(selectedOption.value);
                    }
                  } else {
                    setSelectedPolicyId(undefined);
                  }
                }}
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
