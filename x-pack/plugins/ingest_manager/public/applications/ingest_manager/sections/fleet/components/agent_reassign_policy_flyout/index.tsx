/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiSelect,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import { sendPutAgentReassign, useCore, useGetAgentPolicies } from '../../../../hooks';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

interface Props {
  onClose: () => void;
  agent: Agent;
}

export const AgentReassignAgentPolicyFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agent,
}) => {
  const { notifications } = useCore();
  const [selectedAgentPolicyId, setSelectedAgentPolicyId] = useState<string | undefined>(
    agent.policy_id
  );

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });
  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      if (!selectedAgentPolicyId) {
        throw new Error('No selected agent policy id');
      }
      const res = await sendPutAgentReassign(agent.id, {
        policy_id: selectedAgentPolicyId,
      });
      if (res.error) {
        throw res.error;
      }
      setIsSubmitting(false);
      const successMessage = i18n.translate(
        'xpack.ingestManager.agentReassignPolicy.successSingleNotificationTitle',
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
    <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentReassigmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentReassigmentFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.agentReassignPolicy.flyoutTitle"
              defaultMessage="Assign new agent policy"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ingestManager.agentReassignPolicy.flyoutDescription"
            defaultMessage="Choose a new agent policy to assign the selected agent to."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ingestManager.agentReassignPolicy.selectPolicyLabel', {
                defaultMessage: 'Agent policy',
              })}
            >
              <EuiSelect
                fullWidth
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

        {selectedAgentPolicyId && (
          <AgentPolicyPackageBadges agentPolicyId={selectedAgentPolicyId} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.agentReassignPolicy.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={selectedAgentPolicyId === agent.policy_id}
              fill
              onClick={onSubmit}
              isLoading={isSubmitting}
            >
              <FormattedMessage
                id="xpack.ingestManager.agentReassignPolicy.continueButtonLabel"
                defaultMessage="Assign policy"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
