/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../../common/lib/kibana';
export const UpdateApiKeyModalConfirmation = ({
  onCancel,
  idsToUpdate,
  apiUpdateApiKeyCall,
  setIsLoadingState,
  onUpdated,
}: {
  onCancel: () => void;
  idsToUpdate: string[];
  apiUpdateApiKeyCall: ({ id, http }: { id: string; http: HttpSetup }) => Promise<string>;
  setIsLoadingState: (isLoading: boolean) => void;
  onUpdated: () => void;
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [updateModalFlyoutVisible, setUpdateModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    setUpdateModalVisibility(idsToUpdate.length > 0);
  }, [idsToUpdate]);

  return updateModalFlyoutVisible ? (
    <EuiConfirmModal
      buttonColor="primary"
      data-test-subj="updateApiKeyIdsConfirmation"
      title={i18n.translate('xpack.triggersActionsUI.updateApiKeyConfirmModal.title', {
        defaultMessage: 'Update API key',
      })}
      onCancel={() => {
        setUpdateModalVisibility(false);
        onCancel();
      }}
      onConfirm={async () => {
        setUpdateModalVisibility(false);
        setIsLoadingState(true);
        try {
          await Promise.all(idsToUpdate.map((id) => apiUpdateApiKeyCall({ id, http })));
          toasts.addSuccess(
            i18n.translate('xpack.triggersActionsUI.updateApiKeyConfirmModal.successMessage', {
              defaultMessage:
                'API {idsToUpdate, plural, one {key} other {keys}} {idsToUpdate, plural, one {has} other {have}} been updated',
              values: { idsToUpdate: idsToUpdate.length },
            })
          );
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate(
              'xpack.triggersActionsUI.updateApiKeyConfirmModal.failureMessage',
              {
                defaultMessage:
                  'Failed to update the API {idsToUpdate, plural, one {key} other {keys}}',
                values: { idsToUpdate: idsToUpdate.length },
              }
            ),
          });
        }
        setIsLoadingState(false);
        onUpdated();
      }}
      cancelButtonText={i18n.translate(
        'xpack.triggersActionsUI.updateApiKeyConfirmModal.cancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.triggersActionsUI.updateApiKeyConfirmModal.confirmButton',
        {
          defaultMessage: 'Update',
        }
      )}
    >
      {i18n.translate('xpack.triggersActionsUI.updateApiKeyConfirmModal.description', {
        defaultMessage:
          'You will not be able to recover the old API {idsToUpdate, plural, one {key} other {keys}}',
        values: { idsToUpdate: idsToUpdate.length },
      })}
    </EuiConfirmModal>
  ) : null;
};
