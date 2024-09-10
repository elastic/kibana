/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { UpdateInvestigationParams, UpdateInvestigationResponse } from '@kbn/investigation-shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateInvestigation() {
  const queryClient = useQueryClient();
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    UpdateInvestigationResponse,
    ServerError,
    { investigationId: string; payload: UpdateInvestigationParams },
    { investigationId: string }
  >(
    ['updateInvestigation'],
    ({ investigationId, payload }) => {
      const body = JSON.stringify(payload);
      return http.put<UpdateInvestigationResponse>(
        `/api/observability/investigations/${investigationId}`,
        { body, version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, { investigationId }) => {
        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.useUpdateInvestigation.successMessage', {
            defaultMessage: 'Investigation updated',
          })
        );
        queryClient.invalidateQueries({
          queryKey: investigationKeys.all,
          exact: false,
          refetchType: 'all',
        });
      },
      onError: (error, {}, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.useUpdateInvestigationNote.errorMessage', {
                defaultMessage: 'an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.useUpdateInvestigationNote.errorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
