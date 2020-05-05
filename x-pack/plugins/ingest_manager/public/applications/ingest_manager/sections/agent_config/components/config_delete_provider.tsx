/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../constants';
import { sendDeleteAgentConfig, useCore, useConfig, sendRequest } from '../../../hooks';

interface Props {
  children: (deleteAgentConfig: DeleteAgentConfig) => React.ReactElement;
}

export type DeleteAgentConfig = (agentConfig: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (agentConfigDeleted: string) => void;

export const AgentConfigDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const [agentConfig, setAgentConfig] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deleteAgentConfigPrompt: DeleteAgentConfig = (
    agentConfigToDelete,
    onSuccess = () => undefined
  ) => {
    if (!agentConfigToDelete) {
      throw new Error('No agent config specified for deletion');
    }
    setIsModalOpen(true);
    setAgentConfig(agentConfigToDelete);
    fetchAgentsCount(agentConfigToDelete);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentConfig(undefined);
    setIsLoading(false);
    setIsLoadingAgentsCount(false);
    setIsModalOpen(false);
  };

  const deleteAgentConfig = async () => {
    setIsLoading(true);

    try {
      const { data } = await sendDeleteAgentConfig({
        agentConfigId: agentConfig!,
      });

      if (data?.success) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.ingestManager.deleteAgentConfig.successSingleNotificationTitle', {
            defaultMessage: "Deleted agent config '{id}'",
            values: { id: agentConfig },
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(agentConfig!);
        }
      }

      if (!data?.success) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.deleteAgentConfig.failureSingleNotificationTitle', {
            defaultMessage: "Error deleting agent config '{id}'",
            values: { id: agentConfig },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.deleteAgentConfig.fatalErrorNotificationTitle', {
          defaultMessage: 'Error deleting agent config',
        })
      );
    }
    closeModal();
  };

  const fetchAgentsCount = async (agentConfigToCheck: string) => {
    if (!isFleetEnabled || isLoadingAgentsCount) {
      return;
    }
    setIsLoadingAgentsCount(true);
    const { data } = await sendRequest<{ total: number }>({
      path: `/api/ingest_manager/fleet/agents`,
      method: 'get',
      query: {
        kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id : ${agentConfigToCheck}`,
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
              id="xpack.ingestManager.deleteAgentConfig.confirmModal.deleteConfigTitle"
              defaultMessage="Delete this agent configuration?"
            />
          }
          onCancel={closeModal}
          onConfirm={deleteAgentConfig}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfig.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfig.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfig.confirmModal.confirmButtonLabel"
                defaultMessage="Delete configuration"
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount || !!agentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfig.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking amount of affected agents…"
            />
          ) : agentsCount ? (
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.ingestManager.deleteAgentConfig.confirmModal.affectedAgentsTitle',
                {
                  defaultMessage: 'Configuration in use',
                }
              )}
            >
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentConfig.confirmModal.affectedAgentsMessage"
                defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned to this agent configuration. Unassign these agents before deleting this configuration."
                values={{
                  agentsCount,
                }}
              />
            </EuiCallOut>
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentConfig.confirmModal.irreversibleMessage"
              defaultMessage="This action cannot be undone."
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteAgentConfigPrompt)}
      {renderModal()}
    </Fragment>
  );
};
