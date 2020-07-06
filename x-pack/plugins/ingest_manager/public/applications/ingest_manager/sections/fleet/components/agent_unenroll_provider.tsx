/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useCore, sendRequest } from '../../../hooks';
import { PostAgentUnenrollResponse } from '../../../types';
import { agentRouteService } from '../../../services';

interface Props {
  children: (unenrollAgents: UnenrollAgents) => React.ReactElement;
}

export type UnenrollAgents = (
  agents: string[] | string,
  agentsCount: number,
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (agentsUnenrolled: string[]) => void;

export const AgentUnenrollProvider: React.FunctionComponent<Props> = ({ children }) => {
  const core = useCore();
  const [agents, setAgents] = useState<string[] | string>([]);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const unenrollAgentsPrompt: UnenrollAgents = (
    agentsToUnenroll,
    agentsToUnenrollCount,
    onSuccess = () => undefined
  ) => {
    if (
      agentsToUnenroll === undefined ||
      // !Only supports unenrolling one agent
      (Array.isArray(agentsToUnenroll) && agentsToUnenroll.length !== 1)
    ) {
      throw new Error('No agents specified for unenrollment');
    }
    setIsModalOpen(true);
    setAgents(agentsToUnenroll);
    setAgentsCount(agentsToUnenrollCount);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgents([]);
    setAgentsCount(0);
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const unenrollAgents = async () => {
    setIsLoading(true);

    try {
      const agentId = agents[0];
      const { error } = await sendRequest<PostAgentUnenrollResponse>({
        path: agentRouteService.getUnenrollPath(agentId),
        method: 'post',
      });

      if (error) {
        throw new Error(error.message);
      }

      const successMessage = i18n.translate(
        'xpack.ingestManager.unenrollAgents.successSingleNotificationTitle',
        {
          defaultMessage: "Unenrolling agent '{id}'",
          values: { id: agentId },
        }
      );
      core.notifications.toasts.addSuccess(successMessage);

      if (onSuccessCallback.current) {
        onSuccessCallback.current([agentId]);
      }
    } catch (e) {
      core.notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.unenrollAgents.fatalErrorNotificationTitle', {
          defaultMessage: 'Error unenrolling agents',
        })
      );
    }

    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const unenrollByKuery = typeof agents === 'string';
    const isSingle = agentsCount === 1;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            isSingle && !unenrollByKuery ? (
              <FormattedMessage
                id="xpack.ingestManager.unenrollAgents.confirmModal.deleteSingleTitle"
                defaultMessage="Unenroll agent '{id}'?"
                values={{ id: agents[0] }}
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.unenrollAgents.confirmModal.deleteMultipleTitle"
                defaultMessage="Unenroll {count, plural, one {# agent} other {# agents}}?"
                values={{ count: agentsCount }}
              />
            )
          }
          onCancel={closeModal}
          onConfirm={unenrollAgents}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.unenrollAgents.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading ? (
              <FormattedMessage
                id="xpack.ingestManager.unenrollAgents.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.unenrollAgents.confirmModal.confirmButtonLabel"
                defaultMessage="Unenroll"
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading}
        />
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(unenrollAgentsPrompt)}
      {renderModal()}
    </Fragment>
  );
};
