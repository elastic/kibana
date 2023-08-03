/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';


export const DeletePolicyModal = ({
  policyToDelete,
}: {
  policyToDelete: string;
}) => {
  const handleDeletePipelines = () => {
    services.api
      .deletePipelines(pipelinesToDelete)
      .then(({ data: { itemsDeleted, errors }, error }) => {
        const hasDeletedPipelines = itemsDeleted && itemsDeleted.length;

        if (hasDeletedPipelines) {
          const successMessage =
            itemsDeleted.length === 1
              ? i18n.translate(
                  'xpack.ingestPipelines.deleteModal.successDeleteSingleNotificationMessageText',
                  {
                    defaultMessage: "Deleted pipeline '{pipelineName}'",
                    values: { pipelineName: pipelinesToDelete[0] },
                  }
                )
              : i18n.translate(
                  'xpack.ingestPipelines.deleteModal.successDeleteMultipleNotificationMessageText',
                  {
                    defaultMessage:
                      'Deleted {numSuccesses, plural, one {# pipeline} other {# pipelines}}',
                    values: { numSuccesses: itemsDeleted.length },
                  }
                );

          callback({ hasDeletedPipelines });
          services.notifications.toasts.addSuccess(successMessage);
        }

        if (error || errors?.length) {
          const hasMultipleErrors = errors?.length > 1 || (error && pipelinesToDelete.length > 1);
          const errorMessage = hasMultipleErrors
            ? i18n.translate(
                'xpack.ingestPipelines.deleteModal.multipleErrorsNotificationMessageText',
                {
                  defaultMessage: 'Error deleting {count} pipelines',
                  values: {
                    count: errors?.length || pipelinesToDelete.length,
                  },
                }
              )
            : i18n.translate('xpack.ingestPipelines.deleteModal.errorNotificationMessageText', {
                defaultMessage: "Error deleting pipeline '{name}'",
                values: { name: (errors && errors[0].name) || pipelinesToDelete[0] },
              });
          services.notifications.toasts.addDanger(errorMessage);
        }
      });
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="deletePipelinesConfirmation"
      title="Delete enrich policy"
      onCancel={handleOnCancel}
      onConfirm={handleDeletePipelines}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
    >
      <p>
        You are about to delete the enrich policy <strong>{policyToDelete}</strong>. This action is irreverisble.
      </p>
    </EuiConfirmModal>
  );
};
