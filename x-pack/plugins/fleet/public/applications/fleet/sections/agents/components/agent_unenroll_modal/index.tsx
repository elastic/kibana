/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask, EuiFormFieldset, EuiCheckbox } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import {
  sendPostAgentUnenroll,
  sendPostBulkAgentUnenroll,
  useStartServices,
} from '../../../../hooks';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  useForceUnenroll?: boolean;
}

export const AgentUnenrollAgentModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
  useForceUnenroll,
}) => {
  const { notifications } = useStartServices();
  const [forceUnenroll, setForceUnenroll] = useState<boolean>(useForceUnenroll || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { error } = isSingleAgent
        ? await sendPostAgentUnenroll((agents[0] as Agent).id, {
            force: forceUnenroll,
          })
        : await sendPostBulkAgentUnenroll({
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            force: forceUnenroll,
          });
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      if (forceUnenroll) {
        const successMessage = isSingleAgent
          ? i18n.translate('xpack.fleet.unenrollAgents.successForceSingleNotificationTitle', {
              defaultMessage: 'Agent unenrolled',
            })
          : i18n.translate('xpack.fleet.unenrollAgents.successForceMultiNotificationTitle', {
              defaultMessage: 'Agents unenrolled',
            });
        notifications.toasts.addSuccess(successMessage);
      } else {
        const successMessage = isSingleAgent
          ? i18n.translate('xpack.fleet.unenrollAgents.successSingleNotificationTitle', {
              defaultMessage: 'Unenrolling agent',
            })
          : i18n.translate('xpack.fleet.unenrollAgents.successMultiNotificationTitle', {
              defaultMessage: 'Unenrolling agents',
            });
        notifications.toasts.addSuccess(successMessage);
      }
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.unenrollAgents.fatalErrorNotificationTitle', {
          defaultMessage: 'Error unenrolling {count, plural, one {agent} other {agents}}',
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
              id="xpack.fleet.unenrollAgents.deleteSingleTitle"
              defaultMessage="Unenroll agent"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.forceDeleteMultipleTitle"
              defaultMessage="Unenroll {count} agents"
              values={{ count: agentCount }}
            />
          )
        }
        onCancel={onClose}
        onConfirm={onSubmit}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonDisabled={isSubmitting}
        confirmButtonText={
          isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.confirmSingleButtonLabel"
              defaultMessage="Unenroll agent"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.confirmMultipleButtonLabel"
              defaultMessage="Unenroll {count} agents"
              values={{ count: agentCount }}
            />
          )
        }
        buttonColor="danger"
      >
        <p>
          {isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.deleteSingleDescription"
              defaultMessage='This action will remove the selected agent running on "{hostName}" from Fleet.
              Any data that was already sent by the agent will not be deleted. This action cannot be undone.'
              values={{ hostName: ((agents[0] as Agent).local_metadata.host as any).hostname }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.deleteMultipleDescription"
              defaultMessage="This action will remove multiple agents from Fleet and prevent new data from being ingested.
              Any data that was already sent by these agents will not be affected. This action cannot be undone."
            />
          )}
        </p>
        <EuiFormFieldset
          legend={{
            children: (
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.forceUnenrollLegendText"
                defaultMessage="Force unenroll {count, plural, one {agent} other {agents}}"
                values={{ count: agentCount }}
              />
            ),
          }}
        >
          <EuiCheckbox
            id="ingestManagerForceUnenrollAgents"
            label={
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.forceUnenrollCheckboxLabel"
                defaultMessage="Remove {count, plural, one {agent} other {agents}} immediately.
                  Do not wait for agent to send any last data."
                values={{ count: agentCount }}
              />
            }
            checked={forceUnenroll}
            onChange={(e) => setForceUnenroll(e.target.checked)}
            disabled={useForceUnenroll}
          />
        </EuiFormFieldset>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
