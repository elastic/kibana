/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { Repository } from '../../../common/types';
import { useServices, useToastNotifications } from '../app_context';
import { deleteRepositories } from '../services/http';

interface Props {
  children: (deleteRepository: DeleteRepository) => React.ReactElement;
}

export type DeleteRepository = (
  names: Array<Repository['name']>,
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (repositoriesDeleted: Array<Repository['name']>) => void;

export const RepositoryDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { i18n } = useServices();
  const toastNotifications = useToastNotifications();

  const [repositoryNames, setRepositoryNames] = useState<Array<Repository['name']>>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deleteRepositoryPrompt: DeleteRepository = (names, onSuccess = () => undefined) => {
    if (!names || !names.length) {
      throw new Error('No repository names specified for deletion');
    }
    setIsModalOpen(true);
    setRepositoryNames(names);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRepositoryNames([]);
  };

  const deleteRepository = () => {
    const repositoriesToDelete = [...repositoryNames];
    deleteRepositories(repositoriesToDelete).then(({ data, error }) => {
      const { itemsDeleted, errors } = data || { itemsDeleted: undefined, errors: undefined };

      // Surface success notifications
      if (itemsDeleted && itemsDeleted.length) {
        const hasMultipleSuccesses = itemsDeleted.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.snapshotRestore.deleteRepository.successMultipleNotificationTitle',
              {
                defaultMessage: 'Removed {count} repositories',
                values: { count: itemsDeleted.length },
              }
            )
          : i18n.translate(
              'xpack.snapshotRestore.deleteRepository.successSingleNotificationTitle',
              {
                defaultMessage: "Removed repository '{name}'",
                values: { name: itemsDeleted[0] },
              }
            );
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...itemsDeleted]);
        }
      }

      // Surface error notifications
      // `error` is generic server error
      // `data.errors` are specific errors with removing particular repository(ies)
      if (error || (errors && errors.length)) {
        const hasMultipleErrors =
          (errors && errors.length > 1) || (error && repositoriesToDelete.length > 1);
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.snapshotRestore.deleteRepository.errorMultipleNotificationTitle',
              {
                defaultMessage: 'Error removing {count} repositories',
                values: {
                  count: (errors && errors.length) || repositoriesToDelete.length,
                },
              }
            )
          : i18n.translate('xpack.snapshotRestore.deleteRepository.errorSingleNotificationTitle', {
              defaultMessage: "Error removing repository '{name}'",
              values: { name: (errors && errors[0].name) || repositoriesToDelete[0] },
            });
        toastNotifications.addDanger(errorMessage);
      }
    });
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
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
          data-test-subj="deleteRepositoryConfirmation"
        >
          {isSingle ? (
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteSingleDescription"
                defaultMessage="The snapshots in this repository will still exist, but Elasticsearch won’t have access to them.
                  Adjust policies that use this repository to prevent scheduled snapshots from failing."
              />
            </p>
          ) : (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteMultipleListDescription"
                  defaultMessage="You are about to remove these repositories:"
                />
              </p>
              <ul>
                {repositoryNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.deleteRepository.confirmModal.deleteMultipleDescription"
                  defaultMessage="The snapshots in these repositories will still exist, but Elasticsearch won't have access to them.
                    Adjust policies that use these repositories to prevent scheduled snapshots from failing."
                />
              </p>
            </Fragment>
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteRepositoryPrompt)}
      {renderModal()}
    </Fragment>
  );
};
