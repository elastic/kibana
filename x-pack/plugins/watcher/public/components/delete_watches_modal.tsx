/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { toastNotifications } from 'ui/notify';
import { deleteWatches } from '../lib/api';

export const DeleteWatchesModal = ({
  watchesToDelete,
  callback,
}: {
  watchesToDelete: string[];
  callback: (deleted?: string[]) => void;
}) => {
  const numWatchesToDelete = watchesToDelete.length;
  if (!numWatchesToDelete) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.watcher.deleteSelectedWatchesConfirmModal.descriptionText',
    {
      defaultMessage:
        'This will permanently delete {numWatchesToDelete, plural, one {a watch} other {# watches}}. You can’t recover a deleted watch.',
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
        title={confirmButtonText}
        onCancel={() => callback()}
        onConfirm={async () => {
          const { successes, errors } = await deleteWatches(watchesToDelete);
          const numSuccesses = successes.length;
          const numErrors = errors.length;
          callback(successes);
          if (numSuccesses > 0) {
            toastNotifications.addSuccess(
              i18n.translate(
                'xpack.watcher.sections.watchList.deleteSelectedWatchesSuccessNotification.descriptionText',
                {
                  defaultMessage:
                    'Deleted {numWatchesToDelete, plural, one {watch} other {{numSuccesses} out of # selected watches}} ',
                  values: { numSuccesses, numWatchesToDelete },
                }
              )
            );
          }

          if (numErrors > 0) {
            toastNotifications.addDanger(
              i18n.translate(
                'xpack.watcher.sections.watchList.deleteSelectedWatchesErrorNotification.descriptionText',
                {
                  defaultMessage:
                    "Couldn't delete {numWatchesToDelete, plural, one {watch} other {{numErrors} out of # selected watches}}",
                  values: { numErrors, numWatchesToDelete },
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
