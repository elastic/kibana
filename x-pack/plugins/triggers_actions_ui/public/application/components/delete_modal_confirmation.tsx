/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useMemo } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../../common/lib/kibana';

export const DeleteModalConfirmation = ({
  idsToDelete,
  idsToDeleteFilter,
  numberOfSelectedRules,
  apiDeleteCall,
  onDeleted,
  onCancel,
  onErrors,
  singleTitle,
  multipleTitle,
  showWarningText,
  warningText,
  setIsLoadingState,
}: {
  idsToDelete: string[];
  idsToDeleteFilter?: string;
  numberOfSelectedRules?: number;
  apiDeleteCall: ({
    ids,
    filter,
    http,
  }: {
    ids?: string[];
    filter?: string;
    http: HttpSetup;
  }) => Promise<{ successes: string[]; errors: string[] }>;
  onDeleted: (deleted: string[]) => void;
  onCancel: () => void;
  onErrors: () => void;
  singleTitle: string;
  multipleTitle: string;
  setIsLoadingState: (isLoading: boolean) => void;
  showWarningText?: boolean;
  warningText?: string;
}) => {
  const [deleteModalFlyoutVisible, setDeleteModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    if (idsToDeleteFilter) {
      setDeleteModalVisibility(true);
    } else {
      setDeleteModalVisibility(idsToDelete.length > 0);
    }
  }, [idsToDelete, idsToDeleteFilter]);

  const numIdsToDelete = useMemo(() => {
    if (idsToDeleteFilter) {
      return numberOfSelectedRules;
    }
    return idsToDelete.length;
  }, [idsToDelete, idsToDeleteFilter, numberOfSelectedRules]);

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  if (!deleteModalFlyoutVisible) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.descriptionText',
    {
      defaultMessage:
        "You won't be able to recover {numIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multipleTitle}}}.",
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
        const { successes, errors } = await apiDeleteCall({
          ids: idsToDelete,
          filter: idsToDeleteFilter,
          http,
        });
        setIsLoadingState(false);

        const numSuccesses = successes.length;
        const numErrors = errors.length;
        if (numSuccesses > 0) {
          toasts.addSuccess(
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
          toasts.addDanger(
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
      <p>{confirmModalText}</p>
      {showWarningText && (
        <EuiCallOut title={<>{warningText}</>} color="warning" iconType="alert" />
      )}
    </EuiConfirmModal>
  );
};
