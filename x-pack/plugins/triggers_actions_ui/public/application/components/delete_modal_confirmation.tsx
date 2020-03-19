/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HttpSetup } from 'kibana/public';
import { useAppDependencies } from '../app_context';

export const DeleteModalConfirmation = ({
  idsToDelete,
  apiDeleteCall,
  callback,
  singleTitle,
  multiplyTitle,
}: {
  idsToDelete: string[];
  apiDeleteCall: ({
    ids,
    http,
  }: {
    ids: string[];
    http: HttpSetup;
  }) => Promise<{ successes: string[]; errors: string[] }>;
  callback: (deleted?: string[]) => void;
  singleTitle: string;
  multiplyTitle: string;
}) => {
  const { http, toastNotifications } = useAppDependencies();
  const numIdsToDelete = idsToDelete.length;
  if (!numIdsToDelete) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.descriptionText',
    {
      defaultMessage:
        "You can't recover {numIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multiplyTitle}}}.",
      values: { numIdsToDelete, singleTitle, multiplyTitle },
    }
  );
  const confirmButtonText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.deleteButtonLabel',
    {
      defaultMessage:
        'Delete {numIdsToDelete, plural, one {{singleTitle}} other {# {multiplyTitle}}} ',
      values: { numIdsToDelete, singleTitle, multiplyTitle },
    }
  );
  const cancelButtonText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  );
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteIdsConfirmation"
        title={confirmButtonText}
        onCancel={() => callback()}
        onConfirm={async () => {
          const { successes, errors } = await apiDeleteCall({ ids: idsToDelete, http });
          const numSuccesses = successes.length;
          const numErrors = errors.length;
          callback(successes);
          if (numSuccesses > 0) {
            toastNotifications.addSuccess(
              i18n.translate(
                'xpack.triggersActionsUI.components.deleteSelectedIdsSuccessNotification.descriptionText',
                {
                  defaultMessage:
                    'Deleted {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multiplyTitle}}}',
                  values: { numSuccesses, singleTitle, multiplyTitle },
                }
              )
            );
          }

          if (numErrors > 0) {
            toastNotifications.addDanger(
              i18n.translate(
                'xpack.triggersActionsUI.components.deleteSelectedIdsErrorNotification.descriptionText',
                {
                  defaultMessage:
                    'Failed to delete {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multiplyTitle}}}',
                  values: { numErrors, singleTitle, multiplyTitle },
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
