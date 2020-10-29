/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import { sendPostAgentUpgrade, sendPostBulkAgentUpgrade, useCore } from '../../../../hooks';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  version: string;
}

export const AgentUpgradeAgentModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
  version,
}) => {
  const { notifications } = useCore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { error } = isSingleAgent
        ? await sendPostAgentUpgrade((agents[0] as Agent).id, {
            version,
          })
        : await sendPostBulkAgentUpgrade({
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            version,
          });
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      const successMessage = isSingleAgent
        ? i18n.translate('xpack.fleet.upgradeAgents.successSingleNotificationTitle', {
            defaultMessage: 'Upgrading agent',
          })
        : i18n.translate('xpack.fleet.upgradeAgents.successMultiNotificationTitle', {
            defaultMessage: 'Upgrading agents',
          });
      notifications.toasts.addSuccess(successMessage);
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.upgradeAgents.fatalErrorNotificationTitle', {
          defaultMessage: 'Error upgrading {count, plural, one {agent} other {agents}}',
          values: { count: agentCount },
        }),
      });
    }
  }

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.deleteSingleTitle"
              defaultMessage="Upgrade agent"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.deleteMultipleTitle"
              defaultMessage="Upgrade {count} agents"
              values={{ count: agentCount }}
            />
          )
        }
        onCancel={onClose}
        onConfirm={onSubmit}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonDisabled={isSubmitting}
        confirmButtonText={
          isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.confirmSingleButtonLabel"
              defaultMessage="Upgrade agent"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.confirmMultipleButtonLabel"
              defaultMessage="Upgrade {count} agents"
              values={{ count: agentCount }}
            />
          )
        }
      >
        <p>
          {isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeSingleDescription"
              defaultMessage='This action will upgrade the selected agent running on "{hostName}" to version {version}. This action cannot be undone. Are you sure you wish to continue?'
              values={{
                hostName: ((agents[0] as Agent).local_metadata.host as any).hostname,
                version,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeMultipleDescription"
              defaultMessage="This action will upgrade multiple agents to version {version}. This action cannot be undone. Are you sure you wish to continue?"
              values={{ version }}
            />
          )}
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
