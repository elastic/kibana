/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useCore, sendRequest, sendDeletePackageConfig, useConfig } from '../../../hooks';
import { AGENT_API_ROUTES, AGENT_SAVED_OBJECT_TYPE } from '../../../constants';
import { AgentConfig } from '../../../types';

interface Props {
  agentConfig: AgentConfig;
  children: (deletePackageConfigsPrompt: DeletePackageConfigsPrompt) => React.ReactElement;
}

export type DeletePackageConfigsPrompt = (
  packageConfigsToDelete: string[],
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (packageConfigsDeleted: string[]) => void;

export const PackageConfigDeleteProvider: React.FunctionComponent<Props> = ({
  agentConfig,
  children,
}) => {
  const { notifications } = useCore();
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();
  const [packageConfigs, setPackageConfigs] = useState<string[]>([]);
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

  const deletePackageConfigsPrompt = useMemo(
    (): DeletePackageConfigsPrompt => (packageConfigsToDelete, onSuccess = () => undefined) => {
      if (!Array.isArray(packageConfigsToDelete) || packageConfigsToDelete.length === 0) {
        throw new Error('No package configs specified for deletion');
      }
      setIsModalOpen(true);
      setPackageConfigs(packageConfigsToDelete);
      fetchAgentsCount();
      onSuccessCallback.current = onSuccess;
    },
    [fetchAgentsCount]
  );

  const closeModal = useMemo(
    () => () => {
      setPackageConfigs([]);
      setIsLoading(false);
      setIsLoadingAgentsCount(false);
      setIsModalOpen(false);
    },
    []
  );

  const deletePackageConfigs = useMemo(
    () => async () => {
      setIsLoading(true);

      try {
        const { data } = await sendDeletePackageConfig({ packageConfigIds: packageConfigs });
        const successfulResults = data?.filter((result) => result.success) || [];
        const failedResults = data?.filter((result) => !result.success) || [];

        if (successfulResults.length) {
          const hasMultipleSuccesses = successfulResults.length > 1;
          const successMessage = hasMultipleSuccesses
            ? i18n.translate(
                'xpack.ingestManager.deletePackageConfig.successMultipleNotificationTitle',
                {
                  defaultMessage: 'Deleted {count} integrations',
                  values: { count: successfulResults.length },
                }
              )
            : i18n.translate(
                'xpack.ingestManager.deletePackageConfig.successSingleNotificationTitle',
                {
                  defaultMessage: "Deleted integration '{id}'",
                  values: { id: successfulResults[0].id },
                }
              );
          notifications.toasts.addSuccess(successMessage);
        }

        if (failedResults.length) {
          const hasMultipleFailures = failedResults.length > 1;
          const failureMessage = hasMultipleFailures
            ? i18n.translate(
                'xpack.ingestManager.deletePackageConfig.failureMultipleNotificationTitle',
                {
                  defaultMessage: 'Error deleting {count} integrations',
                  values: { count: failedResults.length },
                }
              )
            : i18n.translate(
                'xpack.ingestManager.deletePackageConfig.failureSingleNotificationTitle',
                {
                  defaultMessage: "Error deleting integration '{id}'",
                  values: { id: failedResults[0].id },
                }
              );
          notifications.toasts.addDanger(failureMessage);
        }

        if (onSuccessCallback.current) {
          onSuccessCallback.current(successfulResults.map((result) => result.id));
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.deletePackageConfig.fatalErrorNotificationTitle', {
            defaultMessage: 'Error deleting integration',
          })
        );
      }
      closeModal();
    },
    [closeModal, packageConfigs, notifications.toasts]
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
              id="xpack.ingestManager.deletePackageConfig.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count, plural, one {integration} other {# integrations}}?"
              values={{ count: packageConfigs.length }}
            />
          }
          onCancel={closeModal}
          onConfirm={deletePackageConfigs}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.deletePackageConfig.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.ingestManager.deletePackageConfig.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.deletePackageConfig.confirmModal.confirmButtonLabel"
                defaultMessage="Delete {agentConfigsCount, plural, one {integration} other {integrations}}"
                values={{
                  agentConfigsCount: packageConfigs.length,
                }}
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.ingestManager.deletePackageConfig.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking affected agents…"
            />
          ) : agentsCount ? (
            <>
              <EuiCallOut
                color="danger"
                title={
                  <FormattedMessage
                    id="xpack.ingestManager.deletePackageConfig.confirmModal.affectedAgentsTitle"
                    defaultMessage="This action will affect {agentsCount} {agentsCount, plural, one {agent} other {agents}}."
                    values={{ agentsCount }}
                  />
                }
              >
                <FormattedMessage
                  id="xpack.ingestManager.deletePackageConfig.confirmModal.affectedAgentsMessage"
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
              id="xpack.ingestManager.deletePackageConfig.confirmModal.generalMessage"
              defaultMessage="This action can not be undone. Are you sure you wish to continue?"
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deletePackageConfigsPrompt)}
      {renderModal()}
    </Fragment>
  );
};
