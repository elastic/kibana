/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { deleteEnrichPolicy } from '../../../../services/api';
import { useAppContext } from '../../../../app_context';

export const DeletePolicyModal = ({
  policyToDelete,
  callback,
}: {
  policyToDelete: string;
  callback: (data?: { hasDeletedPolicy: boolean }) => void;
}) => {
  const mounted = useRef(false);
  const { toasts } = useAppContext();
  const [isDeleting, setIsDeleting] = useState(false);

  // Since the async action of this component needs to set state after unmounting,
  // we need to track the mounted state of this component to avoid a memory leak.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleDeletePolicy = () => {
    setIsDeleting(true);

    deleteEnrichPolicy(policyToDelete)
      .then(({ data, error }) => {
        if (data) {
          const successMessage = i18n.translate(
            'xpack.idxMgmt.enrich_policies.deleteModal.successDeleteNotificationMessage',
            { defaultMessage: 'Deleted {policyToDelete}', values: { policyToDelete } }
          );
          toasts.addSuccess(successMessage);

          return callback({ hasDeletedPolicy: true });
        }

        if (error) {
          const errorMessage = i18n.translate(
            'xpack.idxMgmt.enrich_policies.deleteModal.errorDeleteNotificationMessage',
            {
              defaultMessage: "Error deleting enrich policy: '{error}'",
              values: { error: error.message },
            }
          );
          toasts.addDanger(errorMessage);
        }

        callback();
      })
      .finally(() => {
        if (mounted.current) {
          setIsDeleting(false);
        }
      });
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="deletePolicyModal"
      title={i18n.translate('xpack.idxMgmt.enrich_policies.deleteModal.confirmTitle', {
        defaultMessage: 'Delete enrich policy',
      })}
      onCancel={handleOnCancel}
      onConfirm={handleDeletePolicy}
      cancelButtonText={i18n.translate('xpack.idxMgmt.enrich_policies.deleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.idxMgmt.enrich_policies.deleteModal.deleteButton', {
        defaultMessage: 'Delete',
      })}
      confirmButtonDisabled={isDeleting}
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.enrich_policies.deleteModal.bodyCopy"
          defaultMessage="You are about to delete the enrich policy {policy}. This action is irreverisble."
          values={{
            policy: <strong>{policyToDelete}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
