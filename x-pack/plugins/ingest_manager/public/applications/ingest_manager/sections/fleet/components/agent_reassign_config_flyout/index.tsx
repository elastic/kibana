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
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Datasource, Agent } from '../../../../types';
import {
  useGetOneAgentConfig,
  sendPutAgentReassign,
  useCore,
  useGetAgentConfigs,
} from '../../../../hooks';
import { PackageIcon } from '../../../../components/package_icon';

interface Props {
  onClose: () => void;
  agent: Agent;
}

export const AgentReassignConfigFlyout: React.FunctionComponent<Props> = ({ onClose, agent }) => {
  const { notifications } = useCore();
  const [selectedAgentConfigId, setSelectedAgentConfigId] = useState<string | undefined>(
    agent.config_id
  );

  const agentConfigsRequest = useGetAgentConfigs();
  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  const agentConfigRequest = useGetOneAgentConfig(selectedAgentConfigId);
  const agentConfig = agentConfigRequest.data ? agentConfigRequest.data.item : null;

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
                options={agentConfigs.map(config => ({
                  value: config.id,
                  text: config.name,
                }))}
                value={selectedAgentConfigId}
                onChange={e => setSelectedAgentConfigId(e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />

        {agentConfig && (
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.agentReassignConfig.configDescription"
              defaultMessage="The selected agent configuration will collect data for {count, plural, one {{countValue} data source} other {{countValue} data sources}}:"
              values={{
                count: agentConfig.datasources.length,
                countValue: <b>{agentConfig.datasources.length}</b>,
              }}
            />
          </EuiText>
        )}
        <EuiSpacer size="s" />
        {agentConfig &&
          (agentConfig.datasources as Datasource[]).map((datasource, idx) => {
            if (!datasource.package) {
              return null;
            }
            return (
              <EuiBadge key={idx} color="hollow">
                <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <PackageIcon
                      packageName={datasource.package.name}
                      version={datasource.package.version}
                      size="s"
                      tryApi={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{datasource.package.title}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiBadge>
            );
          })}
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
              disabled={!agentConfig || agentConfig.id === agent.config_id}
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
