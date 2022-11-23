/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';

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
      data-test-subj="deleteIdsConfirmation"
      title={i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {title} after deleting.",
        values: { title },
      })}
      cancelButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.deleteButtonLabel',
        {
          defaultMessage: 'Delete {title}',
          values: { title },
        }
      )}
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
            toasts.addSuccess(
              i18n.translate(
                'xpack.observability.rules.deleteConfirmationModal.successNotification.descriptionText',
                {
                  defaultMessage: 'Deleted {title}',
                  values: { title },
                }
              )
            );
          }

          if (hasErrored) {
            toasts.addDanger(
              i18n.translate(
                'xpack.observability.rules.deleteConfirmationModal.errorNotification.descriptionText',
                {
                  defaultMessage: 'Failed to delete {title}',
                  values: { title },
                }
              )
            );
            onErrors();
          }

          onDeleted();
        }
      }}
    >
      {i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {title} after deleting.",
        values: { title },
      })}
    </EuiConfirmModal>
  );
}
