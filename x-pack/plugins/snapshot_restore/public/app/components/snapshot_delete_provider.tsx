/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { useAppDependencies } from '../index';
import { deleteSnapshots } from '../services/http';

interface Props {
  children: (deleteSnapshot: DeleteSnapshot) => React.ReactElement;
}

export type DeleteSnapshot = (ids: string[], onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (snapshotsDeleted: string[]) => void;

export const SnapshotDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    core: {
      i18n,
      notification: { toastNotifications },
    },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [snapshotIds, setSnapshotIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deleteSnapshotPrompt: DeleteSnapshot = (ids, onSuccess = () => undefined) => {
    if (!ids || !ids.length) {
      throw new Error('No snapshot IDs specified for deletion');
    }
    setIsModalOpen(true);
    setSnapshotIds(ids);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSnapshotIds([]);
  };

  const deleteSnapshot = () => {
    const snapshotsToDelete = [...snapshotIds];
    deleteSnapshots(snapshotsToDelete).then(({ data: { itemsDeleted, errors }, error }) => {
      // Surface success notifications
      if (itemsDeleted && itemsDeleted.length) {
        const hasMultipleSuccesses = itemsDeleted.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.snapshotRestore.deleteSnapshot.successMultipleNotificationTitle',
              {
                defaultMessage: 'Deleted {count} snapshots',
                values: { count: itemsDeleted.length },
              }
            )
          : i18n.translate('xpack.snapshotRestore.deleteSnapshot.successSingleNotificationTitle', {
              defaultMessage: "Deleted snapshot '{name}'",
              values: { name: itemsDeleted[0] },
            });
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...itemsDeleted]);
        }
      }

      // Surface error notifications
      // `error` is generic server error
      // `data.errors` are specific errors with removing particular snapshot(s)
      if (error || (errors && errors.length)) {
        const hasMultipleErrors =
          (errors && errors.length > 1) || (error && snapshotsToDelete.length > 1);
        const errorMessage = hasMultipleErrors
          ? i18n.translate('xpack.snapshotRestore.deleteSnapshot.errorMultipleNotificationTitle', {
              defaultMessage: 'Error deleting {count} snapshots',
              values: {
                count: (errors && errors.length) || snapshotsToDelete.length,
              },
            })
          : i18n.translate('xpack.snapshotRestore.deleteSnapshot.errorSingleNotificationTitle', {
              defaultMessage: "Error deleting snapshot '{name}'",
              values: { name: (errors && errors[0].name) || snapshotsToDelete[0] },
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

    const isSingle = snapshotIds.length === 1;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            isSingle ? (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteSingleTitle"
                defaultMessage="Delete snapshot '{name}'?"
                values={{ name: snapshotIds[0] }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleTitle"
                defaultMessage="Delete {count} snapshots?"
                values={{ count: snapshotIds.length }}
              />
            )
          }
          onCancel={closeModal}
          onConfirm={deleteSnapshot}
          cancelButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.deleteSnapshot.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isSingle ? (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.confirmSingleButtonLabel"
                defaultMessage="Delete snapshot"
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.confirmMultipleButtonLabel"
                defaultMessage="Delete snapshots"
              />
            )
          }
          buttonColor="danger"
          data-test-subj="srdeleteSnapshotConfirmationModal"
        >
          {isSingle ? (
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteSingleDescription"
                defaultMessage="Any recovery operations associated with this snapshot will be stopped."
              />
            </p>
          ) : (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleListDescription"
                  defaultMessage="You are about to delete these snapshots:"
                />
              </p>
              <ul>
                {snapshotIds.map(name => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleDescription"
                  defaultMessage="Any recovery operations associated with these snapshots will be stopped."
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
      {children(deleteSnapshotPrompt)}
      {renderModal()}
    </Fragment>
  );
};
