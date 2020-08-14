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
import { sendDeleteAgentPolicy, useCore, useConfig, sendRequest } from '../../../hooks';

interface Props {
  children: (deleteAgentPolicy: DeleteAgentPolicy) => React.ReactElement;
}

export type DeleteAgentPolicy = (agentPolicy: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (agentPolicyDeleted: string) => void;

export const AgentPolicyDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const [agentPolicy, setAgentPolicy] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deleteAgentPolicyPrompt: DeleteAgentPolicy = (
    agentPolicyToDelete,
    onSuccess = () => undefined
  ) => {
    if (!agentPolicyToDelete) {
      throw new Error('No agent policy specified for deletion');
    }
    setIsModalOpen(true);
    setAgentPolicy(agentPolicyToDelete);
    fetchAgentsCount(agentPolicyToDelete);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentPolicy(undefined);
    setIsLoading(false);
    setIsLoadingAgentsCount(false);
    setIsModalOpen(false);
  };

  const deleteAgentPolicy = async () => {
    setIsLoading(true);

    try {
      const { data } = await sendDeleteAgentPolicy({
        agentPolicyId: agentPolicy!,
      });

      if (data?.success) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.ingestManager.deleteAgentPolicy.successSingleNotificationTitle', {
            defaultMessage: "Deleted agent policy '{id}'",
            values: { id: agentPolicy },
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(agentPolicy!);
        }
      }

      if (!data?.success) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.deleteAgentPolicy.failureSingleNotificationTitle', {
            defaultMessage: "Error deleting agent policy '{id}'",
            values: { id: agentPolicy },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.deleteAgentPolicy.fatalErrorNotificationTitle', {
          defaultMessage: 'Error deleting agent policy',
        })
      );
    }
    closeModal();
  };

  const fetchAgentsCount = async (agentPolicyToCheck: string) => {
    if (!isFleetEnabled || isLoadingAgentsCount) {
      return;
    }
    setIsLoadingAgentsCount(true);
    const { data } = await sendRequest<{ total: number }>({
      path: `/api/ingest_manager/fleet/agents`,
      method: 'get',
      query: {
        kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id : ${agentPolicyToCheck}`,
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
              id="xpack.ingestManager.deleteAgentPolicy.confirmModal.deletePolicyTitle"
              defaultMessage="Delete this agent policy?"
            />
          }
          onCancel={closeModal}
          onConfirm={deleteAgentPolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentPolicy.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentPolicy.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentPolicy.confirmModal.confirmButtonLabel"
                defaultMessage="Delete policy"
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount || !!agentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentPolicy.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking amount of affected agents…"
            />
          ) : agentsCount ? (
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.ingestManager.deleteAgentPolicy.confirmModal.affectedAgentsTitle',
                {
                  defaultMessage: 'Policy in use',
                }
              )}
            >
              <FormattedMessage
                id="xpack.ingestManager.deleteAgentPolicy.confirmModal.affectedAgentsMessage"
                defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned to this agent policy. Unassign these agents before deleting this policy."
                values={{
                  agentsCount,
                }}
              />
            </EuiCallOut>
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.deleteAgentPolicy.confirmModal.irreversibleMessage"
              defaultMessage="This action cannot be undone."
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteAgentPolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
