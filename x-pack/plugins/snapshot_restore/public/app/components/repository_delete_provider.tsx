/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { Repository } from '../../../common/types';
import { useAppDependencies } from '../index';
import { deleteRepositories } from '../services/http';

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

interface Props {
  children: (deleteRepository: DeleteRepository) => React.ReactElement;
}

type DeleteRepository = (names: Array<Repository['name']>) => void;

type OnSuccessCallback = (repositoriesDeleted: Array<Repository['name']>) => void;

export const RepositoryDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    core: {
      i18n,
      notification: { toastNotifications },
    },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [repositoryNames, setRepositoryNames] = useState<Array<Repository['name']>>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const confirmDeleteRepository: DeleteRepository = (
    names: Array<Repository['name']>,
    onSuccess?: OnSuccessCallback
  ): void => {
    setIsModalOpen(true);
    setRepositoryNames(names);
    if (typeof onSuccess === 'function') {
      onSuccessCallback.current = onSuccess;
    } else {
      onSuccessCallback.current = null;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRepositoryNames([]);
  };

  const deleteRepository = () => {
    const repositoriesToDelete = [...repositoryNames];
    deleteRepositories(repositoriesToDelete).then(({ data, error }) => {
      // Surface success notifications
      if (data.success && data.success.length) {
        const hasMultipleSuccesses = data.success.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.snapshotRestore.deleteRepository.successMultipleNotificationTitle',
              {
                defaultMessage: 'Removed {count} repositories',
                values: { count: data.success.length },
              }
            )
          : i18n.translate(
              'xpack.snapshotRestore.deleteRepository.successSingleNotificationTitle',
              {
                defaultMessage: "Removed repository '{name}'",
                values: { name: data.success[0] },
              }
            );
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...data.success]);
        }
      }

      // Surface error notifications
      // `error` is generic server error
      // `data.error` are specific errors with removing particular repository(ies)
      if (error || (data.error && data.error.length)) {
        const hasMultipleErrors =
          (data.error && data.error.length > 1) || (error && repositoriesToDelete.length > 1);
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.snapshotRestore.deleteRepository.errorMultipleNotificationTitle',
              {
                defaultMessage: 'Error removing {count} repositories',
                values: {
                  count: (data.errors && data.errors.length) || repositoriesToDelete.length,
                },
              }
            )
          : i18n.translate('xpack.snapshotRestore.deleteRepository.errorSingleNotificationTitle', {
              defaultMessage: "Error removing repository '{name}'",
              values: { name: (data.errors && data.errors[0].name) || repositoriesToDelete[0] },
            });
        toastNotifications.addDanger(errorMessage);
      }
    });
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen || !repositoryNames || !repositoryNames.length) {
      return null;
    }

    const isSingle = repositoryNames.length === 1;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            isSingle ? (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteSingleTitle"
                defaultMessage="Remove repository '{name}'?"
                values={{ name: repositoryNames[0] }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteMultipleTitle"
                defaultMessage="Remove {count} repositories?"
                values={{ count: repositoryNames.length }}
              />
            )
          }
          onCancel={closeModal}
          onConfirm={deleteRepository}
          cancelButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.deleteRepository.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isSingle ? (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteRepository.confirmModal.confirmSingleButtonLabel"
                defaultMessage="Remove repository"
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteRepository.confirmModal.confirmMultipleButtonLabel"
                defaultMessage="Remove repositories"
              />
            )
          }
          buttonColor="danger"
          data-test-subj="srDeleteRepositoryConfirmationModal"
        >
          {!isSingle && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteMultipleDescription"
                  defaultMessage="You are about to remove these repositories:"
                />
              </p>
              <ul>
                {repositoryNames.map(name => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </Fragment>
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(confirmDeleteRepository)}
      {renderModal()}
    </Fragment>
  );
};
