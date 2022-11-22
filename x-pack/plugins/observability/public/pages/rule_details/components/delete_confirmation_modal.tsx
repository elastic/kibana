/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../../../utils/kibana_react';
import {
  confirmDeleteModalText,
  confirmDeleteButtonText,
  cancelButtonText,
  deleteSuccessText,
  deleteErrorText,
} from '../translations';

interface DeleteConfirmationPropsModal {
  apiDeleteCall: ({
    ids,
    http,
  }: {
    ids: string[];
    http: HttpSetup;
  }) => Promise<{ successes: string[]; errors: string[] }>;
  idToDelete: string | undefined;
  title: string;
  onCancel: () => void;
  onDeleted: () => void;
  onDeleting: () => void;
  onErrors: () => void;
}

export function DeleteConfirmationModal({
  apiDeleteCall,
  idToDelete,
  title,
  onCancel,
  onDeleted,
  onDeleting,
  onErrors,
}: DeleteConfirmationPropsModal) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [deleteModalFlyoutVisible, setDeleteModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    setDeleteModalVisibility(Boolean(idToDelete));
  }, [idToDelete]);

  if (!deleteModalFlyoutVisible) {
    return null;
  }

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="delete-confirmation-modal"
      title={confirmDeleteModalText(title)}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmDeleteButtonText(title)}
      onCancel={() => {
        setDeleteModalVisibility(false);
        onCancel();
      }}
      onConfirm={async () => {
        if (idToDelete) {
          setDeleteModalVisibility(false);
          onDeleting();
          const { successes, errors } = await apiDeleteCall({ ids: [idToDelete], http });

          const hasSucceeded = Boolean(successes.length);
          const hasErrored = Boolean(errors.length);

          if (hasSucceeded) {
            toasts.addSuccess(deleteSuccessText(title));
          }

          if (hasErrored) {
            toasts.addDanger(deleteErrorText(title));
            onErrors();
          }

          onDeleted();
        }
      }}
    >
      {confirmDeleteModalText(title)}
    </EuiConfirmModal>
  );
}
