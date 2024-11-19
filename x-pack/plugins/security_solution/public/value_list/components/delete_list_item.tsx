/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useDeleteListItemMutation } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana';
import { SUCCESSFULLY_DELETED_ITEM } from '../translations';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../common/lib/telemetry';

const toastOptions = {
  toastLifeTimeMs: 5000,
};

export const DeleteListItem = ({ id, value }: { id: string; value: string }) => {
  const { addSuccess, addError } = useAppToasts();
  const http = useKibana().services.http;
  const deleteListItemMutation = useDeleteListItemMutation({
    onSuccess: () => {
      addSuccess(SUCCESSFULLY_DELETED_ITEM, toastOptions);
    },
    onError: (error) => {
      addError(error, {
        title: error.message,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });

  const deleteListItem = useCallback(() => {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.DELETE_VALUE_LIST_ITEM);
    deleteListItemMutation.mutate({ id, http });
  }, [deleteListItemMutation, id, http]);

  return (
    <EuiButtonIcon
      color={'danger'}
      onClick={deleteListItem}
      iconType="trash"
      isLoading={deleteListItemMutation.isLoading}
      data-test-subj={`delete-list-item-${value}`}
    />
  );
};
