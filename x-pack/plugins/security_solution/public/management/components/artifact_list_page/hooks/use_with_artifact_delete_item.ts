/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { HttpFetchError } from 'kibana/public';
import { useToasts } from '../../../../common/lib/kibana';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useDeleteArtifact } from '../../../hooks/artifacts';

export const ARTIFACT_DELETE_ACTION_LABELS = Object.freeze({
  /**
   * Message to be displayed in toast when deletion fails
   * @param itemName
   * @param errorMessage
   * @example
   * (itemsName, errorMessage) => i18n.translate(
   *    'xpack.securitySolution.artifactListPage.deleteActionFailure',
   *    {
   *      defaultMessage: 'Unable to remove "{itemName}" . Reason: {errorMessage}',
   *      values: { itemName, errorMessage },
   *    })
   */
  deleteActionFailure: (itemName: string, errorMessage: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.deleteActionFailure', {
      defaultMessage: 'Unable to remove "{itemName}". Reason: {errorMessage}',
      values: { itemName, errorMessage },
    }),

  /**
   * Message to be displayed in the toast after a successful delete
   * @param itemName
   * @example
   *  (itemName) => i18n.translate('xpack.securitySolution.some_page.deleteSuccess', {
   *    defaultMessage: '"{itemName}" has been removed',
   *    values: { itemName },
   *  })
   */
  deleteActionSuccess: (itemName: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.deleteActionSuccess', {
      defaultMessage: '"{itemName}" has been removed',
      values: { itemName },
    }),
});

type UseArtifactDeleteItemMutationResult = ReturnType<typeof useDeleteArtifact>;

export type UseArtifactDeleteItemInterface = UseArtifactDeleteItemMutationResult & {
  deleteArtifactItem: UseArtifactDeleteItemMutationResult['mutateAsync'];
};

export const useWithArtifactDeleteItem = (
  apiClient: ExceptionsListApiClient,
  item: ExceptionListItemSchema,
  labels: typeof ARTIFACT_DELETE_ACTION_LABELS
): UseArtifactDeleteItemInterface => {
  const toasts = useToasts();
  const deleteArtifact = useDeleteArtifact(apiClient, {
    onError: (error: HttpFetchError) => {
      toasts.addDanger(labels.deleteActionFailure(item.name, error.body?.message || error.message));
    },
    onSuccess: (response) => {
      toasts.addSuccess(labels.deleteActionSuccess(response.name));
    },
  });

  return useMemo(() => {
    return {
      ...deleteArtifact,
      deleteArtifactItem: deleteArtifact.mutateAsync,
    };
  }, [deleteArtifact]);
};
