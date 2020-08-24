/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiTextColor,
  EuiPortal,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { Error } from '../../../components';
import { AgentPolicy, PackageInfo, GetAgentPoliciesResponseItem } from '../../../types';
import { isPackageLimited, doesAgentPolicyAlreadyIncludePackage } from '../../../services';
import {
  useGetPackageInfoByKey,
  useGetAgentPolicies,
  sendGetOneAgentPolicy,
  useCapabilities,
  useFleetStatus,
} from '../../../hooks';
import { CreateAgentPolicyFlyout } from '../list_page/components';

const AgentPolicyWrapper = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

// Custom styling for drop down list items due to:
//  1) the max-width and overflow properties is added to prevent long agent policy
//     names/descriptions from overflowing the flex items
//  2) max-width is built from the grow property on the flex items because the value
//     changes based on if Fleet is enabled/setup or not
const AgentPolicyNameColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;
const AgentPolicyDescriptionColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;

export const StepSelectAgentPolicy: React.FunctionComponent<{
  pkgkey: string;
  updatePackageInfo: (packageInfo: PackageInfo | undefined) => void;
  agentPolicy: AgentPolicy | undefined;
  updateAgentPolicy: (agentPolicy: AgentPolicy | undefined) => void;
  setIsLoadingSecondStep: (isLoading: boolean) => void;
}> = ({ pkgkey, updatePackageInfo, agentPolicy, updateAgentPolicy, setIsLoadingSecondStep }) => {
  const { isReady: isFleetReady } = useFleetStatus();

  // Selected agent policy state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    agentPolicy ? agentPolicy.id : undefined
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
    sendRequest: refreshAgentPolicies,
  } = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
    sortField: 'name',
    sortOrder: 'asc',
    full: true,
  });
  const agentPolicies = agentPoliciesData?.items || [];
  const agentPoliciesById = agentPolicies.reduce(
    (acc: { [key: string]: GetAgentPoliciesResponseItem }, policy) => {
      acc[policy.id] = policy;
      return acc;
    },
    {}
  );

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

  const agentPolicyOptions: Array<EuiComboBoxOptionOption<string>> = packageInfoData
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
    : [];

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
            id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.errorLoadingPackageTitle"
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
            id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.errorLoadingAgentPoliciesTitle"
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
          <AgentPolicyWrapper
            fullWidth={true}
            label={
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.agentPolicyLabel"
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
                        id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.addButton"
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
                  id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsDescriptionText"
                  defaultMessage="{count, plural, one {# agent} other {# agents}} are enrolled with the selected agent policy."
                  values={{
                    count: agentPoliciesById[selectedPolicyId].agents || 0,
                  }}
                />
              ) : null
            }
          >
            <EuiComboBox
              placeholder={i18n.translate(
                'xpack.ingestManager.createPackagePolicy.StepSelectPolicy.agentPolicyPlaceholderText',
                {
                  defaultMessage: 'Select an agent policy to add this integration to',
                }
              )}
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              fullWidth={true}
              isLoading={isAgentPoliciesLoading || isPackageInfoLoading}
              options={agentPolicyOptions}
              renderOption={(option: EuiComboBoxOptionOption<string>) => {
                return (
                  <EuiFlexGroup>
                    <AgentPolicyNameColumn grow={2}>
                      <span className="eui-textTruncate">{option.label}</span>
                    </AgentPolicyNameColumn>
                    <AgentPolicyDescriptionColumn grow={isFleetReady ? 5 : 7}>
                      <EuiTextColor className="eui-textTruncate" color="subdued">
                        {agentPoliciesById[option.value!].description}
                      </EuiTextColor>
                    </AgentPolicyDescriptionColumn>
                    {isFleetReady ? (
                      <EuiFlexItem grow={2} className="eui-textRight">
                        <EuiTextColor color="subdued">
                          <FormattedMessage
                            id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsCountText"
                            defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
                            values={{
                              count: agentPoliciesById[option.value!].agents || 0,
                            }}
                          />
                        </EuiTextColor>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                );
              }}
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
          </AgentPolicyWrapper>
        </EuiFlexItem>
        {/* Display selected agent policy error if there is one */}
        {selectedAgentPolicyError ? (
          <EuiFlexItem>
            <Error
              title={
                <FormattedMessage
                  id="xpack.ingestManager.createPackagePolicy.StepSelectPolicy.errorLoadingSelectedAgentPolicyTitle"
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
