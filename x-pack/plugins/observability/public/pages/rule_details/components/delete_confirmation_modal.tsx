/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { bulkDeleteRules } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';

interface DeleteConfirmationPropsModal {
  ruleIdToDelete: string | undefined;
  title: string;
  onCancel: () => void;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function DeleteConfirmationModal({
  ruleIdToDelete,
  title,
  onCancel,
  onDeleted,
  onDeleting,
}: DeleteConfirmationPropsModal) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isVisible, setIsVisible] = useState(Boolean(ruleIdToDelete));

  return isVisible ? (
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
      onCancel={onCancel}
      onConfirm={async () => {
        if (ruleIdToDelete) {
          setIsVisible(false);

          onDeleting();

          const { errors, rules } = await bulkDeleteRules({ ids: [ruleIdToDelete], http });

          const hasSucceeded = Boolean(rules.length);
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
  ) : null;
}
