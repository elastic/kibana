/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { deleteWatches } from '../lib/api';
import { useAppContext } from '../app_context';

export const DeleteWatchesModal = ({
  watchesToDelete,
  callback,
}: {
  watchesToDelete: string[];
  callback: (deleted?: string[]) => void;
}) => {
  const { toasts } = useAppContext();
  const numWatchesToDelete = watchesToDelete.length;
  if (!numWatchesToDelete) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.watcher.deleteSelectedWatchesConfirmModal.descriptionText',
    {
      defaultMessage:
        "You can't recover {numWatchesToDelete, plural, one {a deleted watch} other {deleted watches}}.",
      values: { numWatchesToDelete },
    }
  );
  const confirmButtonText = i18n.translate(
    'xpack.watcher.deleteSelectedWatchesConfirmModal.deleteButtonLabel',
    {
      defaultMessage: 'Delete {numWatchesToDelete, plural, one {watch} other {# watches}} ',
      values: { numWatchesToDelete },
    }
  );
  const cancelButtonText = i18n.translate(
    'xpack.watcher.deleteSelectedWatchesConfirmModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  );
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteWatchesConfirmation"
        title={confirmButtonText}
        onCancel={() => callback()}
        onConfirm={async () => {
          const { successes, errors } = await deleteWatches(watchesToDelete);
          const numSuccesses = successes.length;
          const numErrors = errors.length;
          callback(successes);
          if (numSuccesses > 0) {
            toasts.addSuccess(
              i18n.translate(
                'xpack.watcher.sections.watchList.deleteSelectedWatchesSuccessNotification.descriptionText',
                {
                  defaultMessage:
                    'Deleted {numSuccesses, number} {numSuccesses, plural, one {watch} other {watches}}',
                  values: { numSuccesses },
                }
              )
            );
          }

          if (numErrors > 0) {
            toasts.addDanger(
              i18n.translate(
                'xpack.watcher.sections.watchList.deleteSelectedWatchesErrorNotification.descriptionText',
                {
                  defaultMessage:
                    'Failed to delete {numErrors, number} {numErrors, plural, one {watch} other {watches}}',
                  values: { numErrors },
                }
              )
            );
          }
        }}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
      >
        {confirmModalText}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
