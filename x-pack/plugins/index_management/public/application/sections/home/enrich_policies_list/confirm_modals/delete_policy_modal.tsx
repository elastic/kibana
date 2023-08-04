/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { deleteEnrichPolicy } from '../../../../services/api';
import { useAppContext } from '../../../../app_context';

export const DeletePolicyModal = ({
  policyToDelete,
  callback,
}: {
  policyToDelete: string;
  callback: (data?: { hasDeletedPolicy: boolean }) => void;
}) => {
  const { toasts } = useAppContext();

  const handleDeletePolicy = () => {
    deleteEnrichPolicy(policyToDelete).then(({ data, error }) => {
      if (data) {
        const successMessage = i18n.translate(
          'xpack.index_management.enrich_policies.deleteModal.successDeleteNotificationMessage',
          { defaultMessage: 'Deleted {policyToDelete}', values: { policyToDelete } }
        );
        toasts.addSuccess(successMessage);

        return callback({ hasDeletedPolicy: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.index_management.enrich_policies.deleteModal.errorDeleteNotificationMessage',
          {
            defaultMessage: "Error deleting enrich policy: '{error}'",
            values: { error: error.message },
          }
        );
        toasts.addDanger(errorMessage);
      }

      callback();
    });
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      buttonColor="danger"
      title="Delete enrich policy"
      onCancel={handleOnCancel}
      onConfirm={handleDeletePolicy}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
    >
      <p>
        You are about to delete the enrich policy <strong>{policyToDelete}</strong>. This action is
        irreverisble.
      </p>
    </EuiConfirmModal>
  );
};
