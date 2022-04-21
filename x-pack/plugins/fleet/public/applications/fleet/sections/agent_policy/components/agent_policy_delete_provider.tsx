/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AGENTS_PREFIX } from '../../../constants';
import { sendDeleteAgentPolicy, useStartServices, useConfig, sendRequest } from '../../../hooks';

interface Props {
  children: (deleteAgentPolicy: DeleteAgentPolicy) => React.ReactElement;
  hasFleetServer: boolean;
}

export type DeleteAgentPolicy = (agentPolicy: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (agentPolicyDeleted: string) => void;

export const AgentPolicyDeleteProvider: React.FunctionComponent<Props> = ({
  children,
  hasFleetServer,
}) => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
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

      if (data) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.deleteAgentPolicy.successSingleNotificationTitle', {
            defaultMessage: "Deleted agent policy '{id}'",
            values: { id: data.name || data.id },
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(agentPolicy!);
        }
      } else {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.deleteAgentPolicy.failureSingleNotificationTitle', {
            defaultMessage: "Error deleting agent policy '{id}'",
            values: { id: agentPolicy },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.fleet.deleteAgentPolicy.fatalErrorNotificationTitle', {
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
      path: `/api/fleet/agents`,
      method: 'get',
      query: {
        kuery: `${AGENTS_PREFIX}.policy_id : ${agentPolicyToCheck}`,
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
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.deletePolicyTitle"
            defaultMessage="Delete this agent policy?"
          />
        }
        onCancel={closeModal}
        onConfirm={deleteAgentPolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          isLoading || isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.fleet.deleteAgentPolicy.confirmModal.loadingButtonLabel"
              defaultMessage="Loading…"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.deleteAgentPolicy.confirmModal.confirmButtonLabel"
              defaultMessage="Delete policy"
            />
          )
        }
        buttonColor="danger"
        confirmButtonDisabled={isLoading || isLoadingAgentsCount || !!agentsCount}
      >
        {isLoadingAgentsCount ? (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.loadingAgentsCountMessage"
            defaultMessage="Checking amount of affected agents…"
          />
        ) : agentsCount ? (
          <EuiCallOut
            color="danger"
            title={i18n.translate(
              'xpack.fleet.deleteAgentPolicy.confirmModal.affectedAgentsTitle',
              {
                defaultMessage: 'Policy in use',
              }
            )}
          >
            <FormattedMessage
              id="xpack.fleet.deleteAgentPolicy.confirmModal.affectedAgentsMessage"
              defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned to this agent policy. Unassign these agents before deleting this policy."
              values={{
                agentsCount,
              }}
            />
          </EuiCallOut>
        ) : hasFleetServer ? (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.fleetServerMessage"
            defaultMessage="NOTE: This policy has Fleet Server integration, it is required for using Fleet."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.deleteAgentPolicy.confirmModal.irreversibleMessage"
            defaultMessage="This action cannot be undone."
          />
        )}
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(deleteAgentPolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
