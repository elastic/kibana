/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiFlexGroup,
  EuiComboBox,
  EuiFlexItem,
  EuiButton,
  EuiLink,
  EuiConfirmModal,
} from '@elastic/eui';

import { useMutation, useQuery } from 'react-query';

import {
  sendGetAgentPolicies,
  sendResetAllPreconfiguredAgentPolicies,
  sendResetOnePreconfiguredAgentPolicy,
  useLink,
  useStartServices,
} from '../../../hooks';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';
import { queryClient } from '..';

import { CodeBlock } from './code_block';

const fetchPreconfiguredPolicies = async () => {
  const kuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_preconfigured:true`;

  const response = await sendGetAgentPolicies({ kuery, perPage: SO_SEARCH_LIMIT, full: true });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.items ?? [];
};

export const PreconfigurationDebugger: React.FunctionComponent = () => {
  const { getHref } = useLink();
  const { notifications } = useStartServices();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isResetAllModalVisible, setIsResetAllModalVisible] = useState(false);

  const preconfiguredPolicies = useQuery(
    'debug-preconfigured-policies',
    fetchPreconfiguredPolicies
  );

  const comboBoxOptions =
    preconfiguredPolicies.data?.map((policy) => ({
      label: policy.name,
      value: policy.id,
    })) ?? [];

  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find(({ value }) => value === selectedPolicyId)!]
    : [];

  const selectedPolicy = preconfiguredPolicies.data?.find(
    (policy) => policy.id === selectedPolicyId
  );

  const resetOnePolicyMutation = useMutation(async (policyId: string) => {
    const response = await sendResetOnePreconfiguredAgentPolicy(policyId);

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: `Error resetting policy`,
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess('Successfully reset policy');
    queryClient.invalidateQueries('debug-preconfigured-policies');
    setSelectedPolicyId(undefined);
    setIsResetModalVisible(false);

    return response.data;
  });

  const resetAllPoliciesMutation = useMutation(async () => {
    const response = await sendResetAllPreconfiguredAgentPolicies();

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: `Error resetting policies`,
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess('Successfully reset all policies');
    queryClient.invalidateQueries('debug-preconfigured-policies');
    setSelectedPolicyId(undefined);
    setIsResetAllModalVisible(false);

    return response.data;
  });

  return (
    <>
      <EuiText grow={false}>
        <p>
          This tool can be used to reset {'"preconfigured"'} policies that are managed via{' '}
          <EuiCode>kibana.yml</EuiCode>. This includes {"Fleet's"} default policies that may exist
          in cloud environments.
        </p>

        <p>
          You may reset a single preconfigured policy or use the {'"Reset all"'} button to reset all
          preconfigured policies at once.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 400px;
          `}
        >
          <EuiComboBox
            aria-label="Select a preconfigured policy"
            placeholder="Select a preconfigured policy"
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            onChange={(newSelectedOptions) => {
              if (!newSelectedOptions.length) {
                setSelectedPolicyId(undefined);
              } else {
                setSelectedPolicyId(newSelectedOptions[0].value);
              }
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="warning"
              isDisabled={!selectedPolicyId}
              onClick={() => setIsResetModalVisible(true)}
            >
              Reset
            </EuiButton>
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="danger"
              isDisabled={!preconfiguredPolicies.data?.length}
              onClick={() => setIsResetAllModalVisible(true)}
            >
              Reset all
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isResetModalVisible && selectedPolicy && selectedPolicyId && (
        <EuiConfirmModal
          title={`Reset ${selectedPolicy.name}`}
          onCancel={() => setIsResetModalVisible(false)}
          onConfirm={() => resetOnePolicyMutation.mutate(selectedPolicyId)}
          isLoading={resetOnePolicyMutation.isLoading}
          cancelButtonText="Cancel"
          confirmButtonText="Reset"
        >
          Are you sure you want to reset {selectedPolicy.name}?
        </EuiConfirmModal>
      )}

      {isResetAllModalVisible && (
        <EuiConfirmModal
          title={`Reset all preconfigured policies`}
          onCancel={() => setIsResetAllModalVisible(false)}
          onConfirm={() => resetAllPoliciesMutation.mutate()}
          isLoading={resetAllPoliciesMutation.isLoading}
          cancelButtonText="Cancel"
          confirmButtonText="Reset all"
        >
          Are you sure you want to reset all preconfigured policies?
        </EuiConfirmModal>
      )}

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />
          <EuiLink target="_blank" href={getHref('policy_details', { policyId: selectedPolicyId })}>
            View Agent Policy in Fleet UI
          </EuiLink>

          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(selectedPolicy, null, 2)} />
        </>
      )}
    </>
  );
};
