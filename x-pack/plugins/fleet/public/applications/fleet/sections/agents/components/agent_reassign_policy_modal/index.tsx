/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent } from '../../../../types';
import {
  sendPutAgentReassign,
  sendPostBulkAgentReassign,
  useStartServices,
  useGetAgentPolicies,
} from '../../../../hooks';
import { AgentPolicyPackageBadges } from '../../../../components';
import { SO_SEARCH_LIMIT } from '../../../../constants';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
}

export const AgentReassignAgentPolicyModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
}) => {
  const { notifications } = useStartServices();
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const agentPolicies = agentPoliciesRequest.data
    ? agentPoliciesRequest.data.items.filter((policy) => policy && !policy.is_managed)
    : [];

  const [selectedAgentPolicyId, setSelectedAgentPolicyId] = useState<string | undefined>(
    isSingleAgent ? (agents[0] as Agent).policy_id : agentPolicies[0]?.id ?? undefined
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  async function onSubmit() {
    try {
      setIsSubmitting(true);
      if (!selectedAgentPolicyId) {
        throw new Error('No selected agent policy id');
      }
      const res = isSingleAgent
        ? await sendPutAgentReassign((agents[0] as Agent).id, {
            policy_id: selectedAgentPolicyId,
          })
        : await sendPostBulkAgentReassign({
            policy_id: selectedAgentPolicyId,
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
          });
      if (res.error) {
        throw res.error;
      }
      setIsSubmitting(false);
      const successMessage = i18n.translate(
        'xpack.fleet.agentReassignPolicy.successSingleNotificationTitle',
        {
          defaultMessage: 'Agent policy reassigned',
        }
      );
      notifications.toasts.addSuccess(successMessage);
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: 'Unable to reassign agent policy',
      });
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="agentReassignPolicyModal"
      title={
        <FormattedMessage
          id="xpack.fleet.agentReassignPolicy.flyoutTitle"
          defaultMessage="Assign new agent policy"
        />
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.agentReassignPolicy.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={
        isSubmitting || (isSingleAgent && selectedAgentPolicyId === (agents[0] as Agent).policy_id)
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.agentReassignPolicy.continueButtonLabel"
          defaultMessage="Assign policy"
        />
      }
      buttonColor="primary"
    >
      <p>
        <FormattedMessage
          id="xpack.fleet.agentReassignPolicy.flyoutDescription"
          defaultMessage="Choose a new agent policy to assign the selected {count, plural, one {agent} other {agents}} to."
          values={{
            count: isSingleAgent ? 1 : 0,
          }}
        />
      </p>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.fleet.agentReassignPolicy.selectPolicyLabel', {
              defaultMessage: 'Agent policy',
            })}
          >
            <EuiSelect
              fullWidth
              isLoading={agentPoliciesRequest.isLoading}
              options={agentPolicies.map((agentPolicy) => ({
                value: agentPolicy.id,
                text: agentPolicy.name,
              }))}
              value={selectedAgentPolicyId}
              onChange={(e) => setSelectedAgentPolicyId(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {selectedAgentPolicyId && <AgentPolicyPackageBadges agentPolicyId={selectedAgentPolicyId} />}
    </EuiConfirmModal>
  );
};
