/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent } from '../../../../types';
import {
  sendPostAgentUpgrade,
  sendPostBulkAgentUpgrade,
  useStartServices,
} from '../../../../hooks';

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
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  const isAllAgents = agents === '';
  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { data, error } = isSingleAgent
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

      const counts = Object.entries(data || {}).reduce(
        (acc, [agentId, result]) => {
          ++acc.total;
          ++acc[result.success ? 'success' : 'error'];
          return acc;
        },
        {
          total: 0,
          success: 0,
          error: 0,
        }
      );
      setIsSubmitting(false);
      const successMessage = isSingleAgent
        ? i18n.translate('xpack.fleet.upgradeAgents.successSingleNotificationTitle', {
            defaultMessage: 'Upgraded {count} agent',
            values: { count: 1 },
          })
        : i18n.translate('xpack.fleet.upgradeAgents.successMultiNotificationTitle', {
            defaultMessage:
              'Upgraded {isMixed, select, true {{success} of {total}} other {{isAllAgents, select, true {all selected} other {{success}} }}} agents',
            values: {
              isMixed: counts.success !== counts.total,
              success: counts.success,
              total: counts.total,
              isAllAgents,
            },
          });
      if (counts.success === counts.total) {
        notifications.toasts.addSuccess(successMessage);
      } else if (counts.error === counts.total) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.upgradeAgents.bulkResultAllErrorsNotificationTitle', {
            defaultMessage:
              'Error upgrading {count, plural, one {agent} other {{count} agents} =true {all selected agents}}',
            values: { count: isAllAgents || agentCount },
          })
        );
      } else {
        notifications.toasts.addWarning({
          title: successMessage,
          text: i18n.translate('xpack.fleet.upgradeAgents.bulkResultErrorResultsSummary', {
            defaultMessage:
              '{count} {count, plural, one {agent was} other {agents were}} not successful',
            values: { count: counts.error },
          }),
        });
      }
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.upgradeAgents.fatalErrorNotificationTitle', {
          defaultMessage:
            'Error upgrading {count, plural, one {agent} other {{count} agents} =true {all selected agents}}',
          values: { count: isAllAgents || agentCount },
        }),
      });
    }
  }

  return (
    <EuiConfirmModal
      title={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {isSingleAgent ? (
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.upgradeSingleTitle"
                defaultMessage="Upgrade agent to latest version"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.upgradeMultipleTitle"
                defaultMessage="Upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}} to latest version"
                values={{ count: isAllAgents || agentCount }}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              iconType="beaker"
              label={
                <FormattedMessage
                  id="xpack.fleet.upgradeAgents.experimentalLabel"
                  defaultMessage="Experimental"
                />
              }
              tooltipContent={
                <FormattedMessage
                  id="xpack.fleet.upgradeAgents.experimentalLabelTooltip"
                  defaultMessage="Upgrade agent might change or be removed in a future release and is not subject to the support SLA."
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
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
            defaultMessage="Upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
            values={{ count: isAllAgents || agentCount }}
          />
        )
      }
    >
      <p>
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.upgradeSingleDescription"
            defaultMessage="This action will upgrade the agent running on '{hostName}' to version {version}. This action can not be undone. Are you sure you wish to continue?"
            values={{
              hostName: ((agents[0] as Agent).local_metadata.host as any).hostname,
              version,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.upgradeMultipleDescription"
            defaultMessage="This action will upgrade multiple agents to version {version}. This action can not be undone. Are you sure you wish to continue?"
            values={{ version }}
          />
        )}
      </p>
    </EuiConfirmModal>
  );
};
