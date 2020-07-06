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
import { sendPutAgentReassign, useCore, useGetAgentConfigs } from '../../../../hooks';
import { AgentConfigPackageBadges } from '../agent_config_package_badges';

interface Props {
  onClose: () => void;
  agent: Agent;
}

export const AgentReassignConfigFlyout: React.FunctionComponent<Props> = ({ onClose, agent }) => {
  const { notifications } = useCore();
  const [selectedAgentConfigId, setSelectedAgentConfigId] = useState<string | undefined>(
    agent.config_id
  );

  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });
  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      if (!selectedAgentConfigId) {
        throw new Error('No selected config id');
      }
      const res = await sendPutAgentReassign(agent.id, {
        config_id: selectedAgentConfigId,
      });
      if (res.error) {
        throw res.error;
      }
      setIsSubmitting(false);
      const successMessage = i18n.translate(
        'xpack.ingestManager.agentReassignConfig.successSingleNotificationTitle',
        {
          defaultMessage: 'Agent configuration reassigned',
        }
      );
      notifications.toasts.addSuccess(successMessage);
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: 'Unable to reassign agent configuration',
      });
    }
  }

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentReassigmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentReassigmentFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.agentReassignConfig.flyoutTitle"
              defaultMessage="Assign new agent configuration"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ingestManager.agentReassignConfig.flyoutDescription"
            defaultMessage="Choose a new agent configuration to assign the selected agent to."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ingestManager.agentReassignConfig.selectConfigLabel', {
                defaultMessage: 'Agent configuration',
              })}
            >
              <EuiSelect
                fullWidth
                options={agentConfigs.map((config) => ({
                  value: config.id,
                  text: config.name,
                }))}
                value={selectedAgentConfigId}
                onChange={(e) => setSelectedAgentConfigId(e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />

        {selectedAgentConfigId && (
          <AgentConfigPackageBadges agentConfigId={selectedAgentConfigId} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.agentReassignConfig.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={selectedAgentConfigId === agent.config_id}
              fill
              onClick={onSubmit}
              isLoading={isSubmitting}
            >
              <FormattedMessage
                id="xpack.ingestManager.agentReassignConfig.continueButtonLabel"
                defaultMessage="Assign configuration"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
