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
  EuiFlexGroup,
  EuiComboBox,
  EuiFlexItem,
  EuiButton,
  EuiConfirmModal,
} from '@elastic/eui';

import { useMutation, useQuery } from 'react-query';

import {
  sendGetOrphanedIntegrationPolicies,
  sendDeleteOneOrphanedIntegrationPolicy,
  useStartServices,
} from '../../../hooks';
import { queryClient } from '..';

import { CodeBlock } from './code_block';

const fetchOrphanedPolicies = async () => {
  const response = await sendGetOrphanedIntegrationPolicies();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.items ?? [];
};

export const OrphanedIntegrationPolicyDebugger: React.FunctionComponent = () => {
  const { notifications } = useStartServices();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleteAllModalVisible, setIsDeleteAllModalVisible] = useState(false);

  const { data: orphanedPolicies } = useQuery('debug-orphaned-policies', fetchOrphanedPolicies);

  const comboBoxOptions =
    orphanedPolicies?.map((policy: { id: string; name: string }) => ({
      label: policy.name,
      value: policy.id,
    })) ?? [];

  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find(({ value }: { value: string }) => value === selectedPolicyId)!]
    : [];

  const selectedPolicy = orphanedPolicies?.find(
    (policy: { id: string }) => policy.id === selectedPolicyId
  );

  const deleteOnePolicyMutation = useMutation(async (policyId: string) => {
    const response = await sendDeleteOneOrphanedIntegrationPolicy({
      ids: [policyId],
    });

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: `Error deleting policy`,
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess('Successfully deleted orphaned policy');
    queryClient.invalidateQueries('debug-orphaned-policies');
    setSelectedPolicyId(undefined);
    setIsDeleteModalVisible(false);

    return response.data;
  });

  const deleteAllPoliciesMutation = useMutation(async () => {
    const response = await sendDeleteOneOrphanedIntegrationPolicy({
      ids: orphanedPolicies?.map((policy: { id: string }) => policy.id),
    });

    if (response.error) {
      notifications.toasts.addError(response.error, {
        title: `Error deleting orphaned policies`,
        toastMessage: response.error.message,
      });
      throw new Error(response.error.message);
    }

    notifications.toasts.addSuccess('Successfully deleted all orphaned policies');
    queryClient.invalidateQueries('debug-orphaned-policies');
    setSelectedPolicyId(undefined);
    setIsDeleteAllModalVisible(false);

    return response.data;
  });

  return (
    <>
      <EuiText grow={false}>
        <p>
          This tool can be used to delete {'"orphaned"'} integration policies that have been
          unlinked from their parent agent policy objects.
        </p>

        <p>
          You may delete a single orphaned integration policy or use the {'"Delete all"'} button to
          delete all orphaned integration policies at once.
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
            aria-label="Select an orphaned integration policy"
            placeholder="Select an orphaned integration policy"
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            onChange={(newSelectedOptions: any[]) => {
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
              onClick={() => setIsDeleteModalVisible(true)}
            >
              Delete
            </EuiButton>
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <EuiButton
              color="danger"
              isDisabled={!orphanedPolicies?.length}
              onClick={() => setIsDeleteAllModalVisible(true)}
            >
              Delete all
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDeleteModalVisible && selectedPolicy && selectedPolicyId && (
        <EuiConfirmModal
          title={`Delete ${selectedPolicy.name}`}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={() => deleteOnePolicyMutation.mutate(selectedPolicyId)}
          isLoading={deleteOnePolicyMutation.isLoading}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
        >
          Are you sure you want to delete {selectedPolicy.name}?
        </EuiConfirmModal>
      )}

      {isDeleteAllModalVisible && (
        <EuiConfirmModal
          title={`Delete all orphaned integration policies`}
          onCancel={() => setIsDeleteAllModalVisible(false)}
          onConfirm={() => deleteAllPoliciesMutation.mutate()}
          isLoading={deleteAllPoliciesMutation.isLoading}
          cancelButtonText="Cancel"
          confirmButtonText="Delete all"
        >
          Are you sure you want to delete all orphaned integration policies?
        </EuiConfirmModal>
      )}

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(selectedPolicy, null, 2)} />
        </>
      )}
    </>
  );
};
