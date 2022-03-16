/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../utils/kibana_react';
import {
  confirmModalText,
  confirmButtonText,
  cancelButtonText,
  deleteSuccessText,
  deleteErrorText,
} from '../translations';

export function DeleteModalConfirmation({
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
}) {
  const [deleteModalFlyoutVisible, setDeleteModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    setDeleteModalVisibility(idsToDelete.length > 0);
  }, [idsToDelete]);

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const numIdsToDelete = idsToDelete.length;
  if (!deleteModalFlyoutVisible) {
    return null;
  }

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="deleteIdsConfirmation"
      title={confirmButtonText(numIdsToDelete, singleTitle, multipleTitle)}
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
          toasts.addSuccess(deleteSuccessText(numSuccesses, singleTitle, multipleTitle));
        }

        if (numErrors > 0) {
          toasts.addDanger(deleteErrorText(numErrors, singleTitle, multipleTitle));
          await onErrors();
        }
        await onDeleted(successes);
      }}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText(numIdsToDelete, singleTitle, multipleTitle)}
    >
      {confirmModalText(numIdsToDelete, singleTitle, multipleTitle)}
    </EuiConfirmModal>
  );
}
