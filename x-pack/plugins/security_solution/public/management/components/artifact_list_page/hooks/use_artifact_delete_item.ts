/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation, UseMutationResult } from 'react-query';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { HttpFetchError } from 'kibana/public';
import { useToasts } from '../../../../common/lib/kibana';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

export const ARTIFACT_DELETE_ACTION_LABELS = Object.freeze({
  deleteActionFailure: (itemName: string, errorMessage: string) =>
    i18n.translate('xpack.securitySolution.deleteActionFailure', {
      defaultMessage: 'Unable to remove "{itemName}" . Reason: {errorMessage}',
      values: { itemName, errorMessage },
    }),

  deleteActionSuccess: (itemName: string) =>
    i18n.translate('xpack.securitySolution.hostIsolationExceptions.deletionDialog.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed',
      values: { itemName },
    }),
});

type UseArtifactDeleteItemMutationResult = UseMutationResult<
  ExceptionListItemSchema,
  Error,
  ExceptionListItemSchema
>;

export type UseArtifactDeleteItemInterface = UseArtifactDeleteItemMutationResult & {
  deleteArtifactItem: UseArtifactDeleteItemMutationResult['mutateAsync'];
};

export const useArtifactDeleteItem = (
  apiClient: ExceptionsListApiClient,
  labels: typeof ARTIFACT_DELETE_ACTION_LABELS
): UseArtifactDeleteItemInterface => {
  const toasts = useToasts();

  const mutation = useMutation(
    async (item: ExceptionListItemSchema) => {
      return apiClient.delete(item.item_id);
    },
    {
      onError: (error: HttpFetchError, item) => {
        toasts.addDanger(
          labels.deleteActionFailure(item.name, error.body?.message || error.message)
        );
      },
      onSuccess: (response) => {
        toasts.addSuccess(labels.deleteActionSuccess(response.name));
      },
    }
  );

  return useMemo(() => {
    return {
      ...mutation,
      deleteArtifactItem: mutation.mutateAsync,
    };
  }, [mutation]);
};
