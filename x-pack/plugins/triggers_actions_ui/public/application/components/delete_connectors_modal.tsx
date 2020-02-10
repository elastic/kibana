/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAppDependencies } from '../app_context';
import { deleteActions } from '../lib/action_connector_api';

export const DeleteConnectorsModal = ({
  connectorsToDelete,
  callback,
}: {
  connectorsToDelete: string[];
  callback: (deleted?: string[]) => void;
}) => {
  const { http, toastNotifications } = useAppDependencies();
  const numConnectorsToDelete = connectorsToDelete.length;
  if (!numConnectorsToDelete) {
    return null;
  }
  const confirmModalText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedConnectorsConfirmModal.descriptionText',
    {
      defaultMessage:
        "You can't recover {numConnectorsToDelete, plural, one {a deleted connector} other {deleted connectors}}.",
      values: { numConnectorsToDelete },
    }
  );
  const confirmButtonText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedConnectorsConfirmModal.deleteButtonLabel',
    {
      defaultMessage:
        'Delete {numConnectorsToDelete, plural, one {connector} other {# connectors}} ',
      values: { numConnectorsToDelete },
    }
  );
  const cancelButtonText = i18n.translate(
    'xpack.triggersActionsUI.deleteSelectedConnectorsConfirmModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  );
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteConnectorsConfirmation"
        title={confirmButtonText}
        onCancel={() => callback()}
        onConfirm={async () => {
          const { successes, errors } = await deleteActions({ ids: connectorsToDelete, http });
          const numSuccesses = successes.length;
          const numErrors = errors.length;
          callback(successes);
          if (numSuccesses > 0) {
            toastNotifications.addSuccess(
              i18n.translate(
                'xpack.triggersActionsUI.sections.connectorsList.deleteSelectedConnectorsSuccessNotification.descriptionText',
                {
                  defaultMessage:
                    'Deleted {numSuccesses, number} {numSuccesses, plural, one {connector} other {connectors}}',
                  values: { numSuccesses },
                }
              )
            );
          }

          if (numErrors > 0) {
            toastNotifications.addDanger(
              i18n.translate(
                'xpack.triggersActionsUI.sections.connectorsList.deleteSelectedConnectorsErrorNotification.descriptionText',
                {
                  defaultMessage:
                    'Failed to delete {numErrors, number} {numErrors, plural, one {connector} other {connectors}}',
                  values: { numErrors },
                }
              )
            );
          }
        }}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
      >
        {confirmModalText}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
