/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useServices } from '../../../app_context';

import { deleteComponentTemplates } from '../../../services/api';

export const ComponentTemplatesDeleteModal = ({
  componentTemplatesToDelete,
  callback,
}: {
  componentTemplatesToDelete: string[];
  callback: (data?: { hasDeletedComponentTemplates: boolean }) => void;
}) => {
  const { notificationService } = useServices();
  const numComponentTemplatesToDelete = componentTemplatesToDelete.length;

  const handleDeleteComponentTemplates = () => {
    deleteComponentTemplates(componentTemplatesToDelete).then(
      ({ data: { itemsDeleted, errors }, error }) => {
        const hasDeletedComponentTemplates = itemsDeleted && itemsDeleted.length;

        if (hasDeletedComponentTemplates) {
          const successMessage =
            itemsDeleted.length === 1
              ? i18n.translate(
                  'xpack.idxMgmt.home.componentTemplates.deleteModal.successDeleteSingleNotificationMessageText',
                  {
                    defaultMessage: "Deleted component template '{componentTemplateName}'",
                    values: { componentTemplateName: componentTemplatesToDelete[0] },
                  }
                )
              : i18n.translate(
                  'xpack.idxMgmt.home.componentTemplates.deleteModal.successDeleteMultipleNotificationMessageText',
                  {
                    defaultMessage:
                      'Deleted {numSuccesses, plural, one {# component template} other {# component templates}}',
                    values: { numSuccesses: itemsDeleted.length },
                  }
                );

          callback({ hasDeletedComponentTemplates });
          notificationService.showSuccessToast(successMessage);
        }

        if (error || errors?.length) {
          const hasMultipleErrors =
            errors?.length > 1 || (error && componentTemplatesToDelete.length > 1);
          const errorMessage = hasMultipleErrors
            ? i18n.translate(
                'xpack.idxMgmt.home.componentTemplates.deleteModal.multipleErrorsNotificationMessageText',
                {
                  defaultMessage: 'Error deleting {count} component templates',
                  values: {
                    count: errors?.length || componentTemplatesToDelete.length,
                  },
                }
              )
            : i18n.translate(
                'xpack.idxMgmt.home.componentTemplates.deleteModal.errorNotificationMessageText',
                {
                  defaultMessage: "Error deleting component template '{name}'",
                  values: { name: (errors && errors[0].name) || componentTemplatesToDelete[0] },
                }
              );
          notificationService.showDangerToast(errorMessage);
        }
      }
    );
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteComponentTemplatesConfirmation"
        title={
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.deleteModal.modalTitleText"
            defaultMessage="Delete {numComponentTemplatesToDelete, plural, one {component template} other {# component templates}}"
            values={{ numComponentTemplatesToDelete }}
          />
        }
        onCancel={handleOnCancel}
        onConfirm={handleDeleteComponentTemplates}
        cancelButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.deleteModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.confirmButtonLabel"
            defaultMessage="Delete {numComponentTemplatesToDelete, plural, one {component template} other {component templates} }"
            values={{ numComponentTemplatesToDelete }}
          />
        }
      >
        <>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.home.componentTemplates.deleteModal.deleteDescription"
              defaultMessage="You are about to delete {numComponentTemplatesToDelete, plural, one {this component template} other {these component templates} }:"
              values={{ numComponentTemplatesToDelete }}
            />
          </p>

          <ul>
            {componentTemplatesToDelete.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
