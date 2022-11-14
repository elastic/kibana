/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { KueryNode } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useMemo } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../../common/lib/kibana';
import { useBulkEditResponse } from '../hooks/use_bulk_edit_response';
import { BulkEditResponse } from '../../types';

export const UpdateApiKeyModalConfirmation = ({
  onCancel,
  idsToUpdate,
  idsToUpdateFilter,
  numberOfSelectedRules = 0,
  apiUpdateApiKeyCall,
  setIsLoadingState,
  onUpdated,
  onSearchPopulate,
}: {
  onCancel: () => void;
  idsToUpdate: string[];
  idsToUpdateFilter?: KueryNode | null | undefined;
  numberOfSelectedRules?: number;
  apiUpdateApiKeyCall: ({
    ids,
    http,
    filter,
  }: {
    ids?: string[];
    filter?: KueryNode | null | undefined;
    http: HttpSetup;
  }) => Promise<BulkEditResponse>;
  setIsLoadingState: (isLoading: boolean) => void;
  onUpdated: () => void;
  onSearchPopulate?: (filter: string) => void;
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [updateModalFlyoutVisible, setUpdateModalVisibility] = useState<boolean>(false);

  const { showToast } = useBulkEditResponse({ onSearchPopulate });

  useEffect(() => {
    if (typeof idsToUpdateFilter !== 'undefined') {
      setUpdateModalVisibility(true);
    } else {
      setUpdateModalVisibility(idsToUpdate.length > 0);
    }
  }, [idsToUpdate, idsToUpdateFilter]);

  const numberOfIdsToUpdate = useMemo(() => {
    if (typeof idsToUpdateFilter !== 'undefined') {
      return numberOfSelectedRules;
    }
    return idsToUpdate.length;
  }, [idsToUpdate, idsToUpdateFilter, numberOfSelectedRules]);

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
          const response = await apiUpdateApiKeyCall({
            ids: idsToUpdate,
            filter: idsToUpdateFilter,
            http,
          });
          showToast(response, 'apiKey');
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate(
              'xpack.triggersActionsUI.updateApiKeyConfirmModal.failureMessage',
              {
                defaultMessage:
                  'Failed to update the API {idsToUpdate, plural, one {key} other {keys}}',
                values: { idsToUpdate: numberOfIdsToUpdate },
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
        values: { idsToUpdate: numberOfIdsToUpdate },
      })}
    </EuiConfirmModal>
  ) : null;
};
