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
      (Array.isArray(agentsToUnenroll) && agentsToUnenroll.length === 0)
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
      const unenrollByKuery = typeof agents === 'string';
      const { data, error } = await sendRequest<PostAgentUnenrollResponse>({
        path: agentRouteService.getUnenrollPath(),
        method: 'post',
        body: JSON.stringify({
          kuery: unenrollByKuery ? agents : undefined,
          ids: !unenrollByKuery ? agents : undefined,
        }),
      });

      if (error) {
        throw new Error(error.message);
      }

      const results = data ? data.results : [];

      const successfulResults = results.filter(result => result.success);
      const failedResults = results.filter(result => !result.success);

      if (successfulResults.length) {
        const hasMultipleSuccesses = successfulResults.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate('xpack.ingestManager.unenrollAgents.successMultipleNotificationTitle', {
              defaultMessage: 'Unenrolled {count} agents',
              values: { count: successfulResults.length },
            })
          : i18n.translate('xpack.ingestManager.unenrollAgents.successSingleNotificationTitle', {
              defaultMessage: "Unenrolled agent '{id}'",
              values: { id: successfulResults[0].id },
            });
        core.notifications.toasts.addSuccess(successMessage);
      }

      if (failedResults.length) {
        const hasMultipleFailures = failedResults.length > 1;
        const failureMessage = hasMultipleFailures
          ? i18n.translate('xpack.ingestManager.unenrollAgents.failureMultipleNotificationTitle', {
              defaultMessage: 'Error unenrolling {count} agents',
              values: { count: failedResults.length },
            })
          : i18n.translate('xpack.ingestManager.unenrollAgents.failureSingleNotificationTitle', {
              defaultMessage: "Error unenrolling agent '{id}'",
              values: { id: failedResults[0].id },
            });
        core.notifications.toasts.addDanger(failureMessage);
      }

      if (onSuccessCallback.current) {
        onSuccessCallback.current(successfulResults.map(result => result.id));
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
