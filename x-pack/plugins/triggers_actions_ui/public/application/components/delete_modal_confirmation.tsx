/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { useAppDependencies } from '../app_context';

export const DeleteModalConfirmation = ({
  idsToDelete,
  apiDeleteCall,
  onDeleted,
  onCancel,
  onErrors,
  singleTitle,
  multipleTitle,
  setIsLoadingState,
}: {
  idsToDelete: string[];
  apiDeleteCall: ({
    ids,
    http,
  }: {
    ids: string[];
    http: HttpSetup;
  }) => Promise<{ successes: string[]; errors: string[] }>;
  onDeleted: (deleted: string[]) => void;
  onCancel: () => void;
  onErrors: () => void;
  singleTitle: string;
  multipleTitle: string;
  setIsLoadingState: (isLoading: boolean) => void;
}) => {
  const [deleteModalFlyoutVisible, setDeleteModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    setDeleteModalVisibility(idsToDelete.length > 0);
  }, [idsToDelete]);

  const { http, toastNotifications } = useAppDependencies();
  const numIdsToDelete = idsToDelete.length;
  if (!deleteModalFlyoutVisible) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.descriptionText',
    {
      defaultMessage:
        "You can't recover {numIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multipleTitle}}}.",
      values: { numIdsToDelete, singleTitle, multipleTitle },
    }
  );
  const confirmButtonText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.deleteButtonLabel',
    {
      defaultMessage:
        'Delete {numIdsToDelete, plural, one {{singleTitle}} other {# {multipleTitle}}} ',
      values: { numIdsToDelete, singleTitle, multipleTitle },
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
        onCancel={() => {
          setDeleteModalVisibility(false);
          onCancel();
        }}
        onConfirm={async () => {
          setDeleteModalVisibility(false);
          setIsLoadingState(true);
          const { successes, errors } = await apiDeleteCall({ ids: idsToDelete, http });
          setIsLoadingState(false);

          const numSuccesses = successes.length;
          const numErrors = errors.length;
          if (numSuccesses > 0) {
            toastNotifications.addSuccess(
              i18n.translate(
                'xpack.triggersActionsUI.components.deleteSelectedIdsSuccessNotification.descriptionText',
                {
                  defaultMessage:
                    'Deleted {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
                  values: { numSuccesses, singleTitle, multipleTitle },
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
                    'Failed to delete {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
                  values: { numErrors, singleTitle, multipleTitle },
                }
              )
            );
            await onErrors();
          }
          await onDeleted(successes);
        }}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
      >
        {confirmModalText}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
