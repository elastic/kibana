/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useCore, sendRequest, sendDeleteDatasource, useConfig } from '../../../hooks';
import { AGENT_API_ROUTES, AGENT_SAVED_OBJECT_TYPE } from '../../../constants';
import { AgentConfig } from '../../../types';

interface Props {
  agentConfig: AgentConfig;
  children: (deleteDatasourcePrompt: DeleteAgentConfigDatasourcePrompt) => React.ReactElement;
}

export type DeleteAgentConfigDatasourcePrompt = (
  datasourcesToDelete: string[],
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (datasourcesDeleted: string[]) => void;

export const DatasourceDeleteProvider: React.FunctionComponent<Props> = ({
  agentConfig,
  children,
}) => {
  const { notifications } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const [datasources, setDatasources] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const fetchAgentsCount = useMemo(
    () => async () => {
      if (isLoadingAgentsCount || !isFleetEnabled) {
        return;
      }
      setIsLoadingAgentsCount(true);
      const { data } = await sendRequest<{ total: number }>({
        path: AGENT_API_ROUTES.LIST_PATTERN,
        method: 'get',
        query: {
          page: 1,
          perPage: 1,
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id : ${agentConfig.id}`,
        },
      });
      setAgentsCount(data?.total || 0);
      setIsLoadingAgentsCount(false);
    },
    [agentConfig.id, isFleetEnabled, isLoadingAgentsCount]
  );

  const deleteDatasourcesPrompt = useMemo(
    (): DeleteAgentConfigDatasourcePrompt => (datasourcesToDelete, onSuccess = () => undefined) => {
      if (!Array.isArray(datasourcesToDelete) || datasourcesToDelete.length === 0) {
        throw new Error('No datasources specified for deletion');
      }
      setIsModalOpen(true);
      setDatasources(datasourcesToDelete);
      fetchAgentsCount();
      onSuccessCallback.current = onSuccess;
    },
    [fetchAgentsCount]
  );

  const closeModal = useMemo(
    () => () => {
      setDatasources([]);
      setIsLoading(false);
      setIsLoadingAgentsCount(false);
      setIsModalOpen(false);
    },
    []
  );

  const deleteDatasources = useMemo(
    () => async () => {
      setIsLoading(true);

      try {
        const { data } = await sendDeleteDatasource({ datasourceIds: datasources });
        const successfulResults = data?.filter(result => result.success) || [];
        const failedResults = data?.filter(result => !result.success) || [];

        if (successfulResults.length) {
          const hasMultipleSuccesses = successfulResults.length > 1;
          const successMessage = hasMultipleSuccesses
            ? i18n.translate(
                'xpack.ingestManager.deleteDatasource.successMultipleNotificationTitle',
                {
                  defaultMessage: 'Deleted {count} data sources',
                  values: { count: successfulResults.length },
                }
              )
            : i18n.translate(
                'xpack.ingestManager.deleteDatasource.successSingleNotificationTitle',
                {
                  defaultMessage: "Deleted data source '{id}'",
                  values: { id: successfulResults[0].id },
                }
              );
          notifications.toasts.addSuccess(successMessage);
        }

        if (failedResults.length) {
          const hasMultipleFailures = failedResults.length > 1;
          const failureMessage = hasMultipleFailures
            ? i18n.translate(
                'xpack.ingestManager.deleteDatasource.failureMultipleNotificationTitle',
                {
                  defaultMessage: 'Error deleting {count} data sources',
                  values: { count: failedResults.length },
                }
              )
            : i18n.translate(
                'xpack.ingestManager.deleteDatasource.failureSingleNotificationTitle',
                {
                  defaultMessage: "Error deleting data source '{id}'",
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
          i18n.translate('xpack.ingestManager.deleteDatasource.fatalErrorNotificationTitle', {
            defaultMessage: 'Error deleting data source',
          })
        );
      }
      closeModal();
    },
    [closeModal, datasources, notifications.toasts]
  );

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.ingestManager.deleteDatasource.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count, plural, one {data source} other {# data sources}}?"
              values={{ count: datasources.length }}
            />
          }
          onCancel={closeModal}
          onConfirm={deleteDatasources}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.deleteDatasource.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deleteDatasource.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.deleteDatasource.confirmModal.confirmButtonLabel"
                defaultMessage="Delete {agentConfigsCount, plural, one {data source} other {data sources}}"
                values={{
                  agentConfigsCount: datasources.length,
                }}
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deleteDatasource.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking affected agents…"
            />
          ) : agentsCount ? (
            <>
              <EuiCallOut
                color="danger"
                title={
                  <FormattedMessage
                    id="xpack.ingestManager.deleteDatasource.confirmModal.affectedAgentsTitle"
                    defaultMessage="This action will affect {agentsCount} {agentsCount, plural, one {agent} other {agents}}."
                    values={{ agentsCount }}
                  />
                }
              >
                <FormattedMessage
                  id="xpack.ingestManager.deleteDatasource.confirmModal.affectedAgentsMessage"
                  defaultMessage="Fleet has detected that {agentConfigName} is already in use by some of your agents."
                  values={{
                    agentConfigName: <strong>{agentConfig.name}</strong>,
                  }}
                />
              </EuiCallOut>
              <EuiSpacer size="l" />
            </>
          ) : null}
          {!isLoadingAgentsCount && (
            <FormattedMessage
              id="xpack.ingestManager.deleteDatasource.confirmModal.generalMessage"
              defaultMessage="This action can not be undone. Are you sure you wish to continue?"
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteDatasourcesPrompt)}
      {renderModal()}
    </Fragment>
  );
};
