/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
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
      buttonColor="danger"
      data-test-subj="updateApiKeyIdsConfirmation"
      title="Confirm Update"
      onCancel={() => {
        setUpdateModalVisibility(false);
        onCancel();
      }}
      onConfirm={async () => {
        setUpdateModalVisibility(false);
        setIsLoadingState(true);
        try {
          await apiUpdateApiKeyCall({ id: idsToUpdate[0], http });
          toasts.addSuccess('Updated');
        } catch (e) {
          toasts.addError(e, { title: 'Failed' });
        }
        setIsLoadingState(false);
        onUpdated();
      }}
      cancelButtonText="Cancel"
      confirmButtonText="OK"
    >
      Are you sure
    </EuiConfirmModal>
  ) : null;
};
