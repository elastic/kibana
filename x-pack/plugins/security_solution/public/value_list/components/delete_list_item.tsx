/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useDeleteListItemMutation } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana';

const toastOptions = {
  toastLifeTimeMs: 5000,
};

export const DeleteListItem = ({ id }: { id: string }) => {
  const { addSuccess, addError } = useAppToasts();
  const http = useKibana().services.http;
  const deleteListItemMutation = useDeleteListItemMutation({
    onSuccess: () => {
      addSuccess('Succesfully deleted list item', toastOptions);
    },
    onError: (error) => {
      addError(error, {
        title: error.message,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });

  return (
    <EuiButtonIcon
      color={'danger'}
      onClick={() => deleteListItemMutation.mutate({ id, http })}
      iconType="trash"
      isLoading={deleteListItemMutation.isLoading}
    />
  );
};
