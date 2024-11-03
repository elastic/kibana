/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import { isEqual } from 'lodash';
import styled from 'styled-components';

import { AgentPolicyMultiSelect } from '../applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/agent_policy_multi_select';
import { useAgentPoliciesOptions } from '../applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/agent_policy_options';
import type { AgentPolicy } from '../types';
import { usePackagePolicyWithRelatedData } from '../applications/fleet/sections/agent_policy/edit_package_policy_page/hooks';
import { useStartServices } from '../hooks';

const StyledEuiConfirmModal = styled(EuiConfirmModal)`
  min-width: 448px;
`;

interface Props {
  onClose: () => void;
  selectedAgentPolicies: AgentPolicy[];
  packagePolicyId: string;
  onAgentPoliciesChange: () => void;
}

export const ManageAgentPoliciesModal: React.FunctionComponent<Props> = ({
  onClose,
  selectedAgentPolicies,
  packagePolicyId,
  onAgentPoliciesChange,
}) => {
  const initialPolicyIds = selectedAgentPolicies.map((policy) => policy.id);

  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>(initialPolicyIds);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { notifications } = useStartServices();
  const { packageInfo, packagePolicy, savePackagePolicy } = usePackagePolicyWithRelatedData(
    packagePolicyId,
    {}
  );

  const removedPolicies = useMemo(
    () =>
      selectedAgentPolicies
        .filter((policy) => !selectedPolicyIds.find((id) => policy.id === id))
        .map((policy) => policy.name),
    [selectedAgentPolicies, selectedPolicyIds]
  );

  const onCancel = () => {
    onClose();
  };

  const onConfirm = async () => {
    setIsSubmitting(true);
    const { error } = await savePackagePolicy({
      policy_ids: selectedPolicyIds,
      ...(selectedPolicyIds.length === 0
        ? {
            policy_id: undefined,
          }
        : {}),
    });
    setIsSubmitting(false);
    if (!error) {
      onAgentPoliciesChange();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.manageAgentPolicies.updatedNotificationTitle', {
          defaultMessage: `Successfully updated ''{packagePolicyName}''`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        'data-test-subj': 'policyUpdateSuccessToast',
      });
    } else {
      if (error.statusCode === 409) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.manageAgentPolicies.failedNotificationTitle', {
            defaultMessage: `Error updating ''{packagePolicyName}''`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.fleet.manageAgentPolicies.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest policy.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.manageAgentPolicies.failedNotificationTitle', {
            defaultMessage: `Error updating ''{packagePolicyName}''`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
        });
      }
    }
    onClose();
  };

  const { agentPolicyMultiOptions, isLoading } = useAgentPoliciesOptions(packageInfo);

  return (
    <StyledEuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.fleet.manageAgentPolicies.confirmModalTitle"
          defaultMessage="Manage agent policies"
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.manageAgentPolicies.confirmModalCancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.manageAgentPolicies.confirmModalConfirmButtonLabel"
          defaultMessage="Confirm"
        />
      }
      buttonColor="primary"
      confirmButtonDisabled={isSubmitting || isEqual(initialPolicyIds, selectedPolicyIds)}
      data-test-subj="manageAgentPoliciesModal"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.manageAgentPolicies.confirmModalDescription"
              defaultMessage="Agent policies sharing this integration"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText data-test-subj="integrationNameText">
            <b>
              <FormattedMessage
                id="xpack.fleet.manageAgentPolicies.integrationName"
                defaultMessage="Integration: "
              />
            </b>
            {packagePolicy.name}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.fleet.manageAgentPolicies.agentPoliciesLabel"
                defaultMessage="Agent policies"
              />
            }
          >
            <AgentPolicyMultiSelect
              isLoading={isLoading}
              selectedPolicyIds={selectedPolicyIds}
              setSelectedPolicyIds={setSelectedPolicyIds}
              agentPolicyMultiOptions={agentPolicyMultiOptions}
              selectedAgentPolicies={selectedAgentPolicies}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {removedPolicies.length > 0 && (
          <EuiFlexItem>
            <EuiCallOut
              data-test-subj="confirmRemovePoliciesCallout"
              title={
                <FormattedMessage
                  id="xpack.fleet.manageAgentPolicies.calloutTitle"
                  defaultMessage="This action will update this integration"
                />
              }
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.fleet.manageAgentPolicies.calloutBody"
                  defaultMessage="{removedPolicies} will no longer use this integration."
                  values={{ removedPolicies: <b>{removedPolicies.join(', ')}</b> }}
                />
              </EuiText>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.manageAgentPolicies.confirmText"
              defaultMessage="Are you sure you wish to continue?"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledEuiConfirmModal>
  );
};
