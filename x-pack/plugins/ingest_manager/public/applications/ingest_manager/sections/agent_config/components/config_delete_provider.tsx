/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { sendDeleteAgentConfigs, useCore, sendRequest } from '../../../hooks';

interface Props {
  children: (deleteAgentConfigs: deleteAgentConfigs) => React.ReactElement;
}

export type deleteAgentConfigs = (agentConfigs: string[], onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (agentConfigsUnenrolled: string[]) => void;

export const AgentConfigDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useCore();
  const [agentConfigs, setAgentConfigs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deleteAgentConfigsPrompt: deleteAgentConfigs = (
    agentConfigsToDelete,
    onSuccess = () => undefined
  ) => {
    if (
      agentConfigsToDelete === undefined ||
      (Array.isArray(agentConfigsToDelete) && agentConfigsToDelete.length === 0)
    ) {
      throw new Error('No agent configs specified for deletion');
    }
    setIsModalOpen(true);
    setAgentConfigs(agentConfigsToDelete);
    fetchAgentsCount(agentConfigsToDelete);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentConfigs([]);
    setIsLoading(false);
    setIsLoadingAgentsCount(false);
    setIsModalOpen(false);
  };

  const deleteAgentConfigs = async () => {
    setIsLoading(true);

    try {
      const { data } = await sendDeleteAgentConfigs({
        agentConfigIds: agentConfigs,
      });
      const successfulResults = data?.filter(result => result.success) || [];
      const failedResults = data?.filter(result => !result.success) || [];

      if (successfulResults.length) {
        const hasMultipleSuccesses = successfulResults.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.ingestManager.deleteAgentConfigs.successMultipleNotificationTitle',
              {
                defaultMessage: 'Deleted {count} agent configs',
                values: { count: successfulResults.length },
              }
            )
          : i18n.translate(
              'xpack.ingestManager.deleteAgentConfigs.successSingleNotificationTitle',
              {
                defaultMessage: "Deleted agent config '{id}'",
                values: { id: successfulResults[0].id },
              }
            );
        notifications.toasts.addSuccess(successMessage);
      }

      if (failedResults.length) {
        const hasMultipleFailures = failedResults.length > 1;
        const failureMessage = hasMultipleFailures
          ? i18n.translate(
              'xpack.ingestManager.deleteAgentConfigs.failureMultipleNotificationTitle',
              {
                defaultMessage: 'Error deleting {count} agent configs',
                values: { count: failedResults.length },
              }
            )
          : i18n.translate(
              'xpack.ingestManager.deleteAgentConfigs.failureSingleNotificationTitle',
              {
                defaultMessage: "Error deleting agent config '{id}'",
                values: { id: failedResults[0].id },
              }
            );
        notifications.toasts.addDanger(failureMessage);
      }

      if (onSuccessCallback.current) {
        onSuccessCallback.current(successfulResults.map(result => result.id));
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.deleteAgentConfigs.fatalErrorNotificationTitle', {
          defaultMessage: 'Error deleting agent configs',
        })
      );
    }
    closeModal();
  };

  const fetchAgentsCount = async (agentConfigsToCheck: string[]) => {
    if (isLoadingAgentsCount) {
      return;
    }
    setIsLoadingAgentsCount(true);
    const { data } = await sendRequest<{ total: number }>({
      path: `/api/fleet/agents`,
      method: 'get',
      query: {
        kuery: `agents.policy_id : (${agentConfigsToCheck.join(' or ')})`,
      },
    });
    setAgentsCount(data?.total || 0);
    setIsLoadingAgentsCount(false);
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfigs.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count, plural, one {this agent config} other {# agent configs}}?"
              values={{ count: agentConfigs.length }}
            />
          }
          onCancel={closeModal}
          onConfirm={deleteAgentConfigs}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfigs.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfigs.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : agentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfigs.confirmModal.confirmAndReassignButtonLabel"
                defaultMessage="Delete {agentConfigsCount, plural, one {agent config} other {agent configs}} and unenroll {agentsCount, plural, one {agent} other {agents}}"
                values={{
                  agentsCount,
                  agentConfigsCount: agentConfigs.length,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfigs.confirmModal.confirmButtonLabel"
                defaultMessage="Delete {agentConfigsCount, plural, one {agent config} other {agent configs}}"
                values={{
                  agentConfigsCount: agentConfigs.length,
                }}
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfigs.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking amount of affected agents…"
            />
          ) : agentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfigs.confirmModal.affectedAgentsMessage"
              defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned {agentConfigsCount, plural, one {to this agent config} other {across these agentConfigs}}. {agentsCount, plural, one {This agent} other {These agents}} will be unenrolled."
              values={{
                agentsCount,
                agentConfigsCount: agentConfigs.length,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfigs.confirmModal.noAffectedAgentsMessage"
              defaultMessage="There are no agents assigned to {agentConfigsCount, plural, one {this agent config} other {these agentConfigs}}."
              values={{
                agentConfigsCount: agentConfigs.length,
              }}
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteAgentConfigsPrompt)}
      {renderModal()}
    </Fragment>
  );
};
