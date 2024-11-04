/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import {
  CreateInvestigationParams,
  CreateInvestigationResponse,
  FindInvestigationsResponse,
} from '@kbn/investigation-shared';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateInvestigation() {
  const queryClient = useQueryClient();
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    CreateInvestigationResponse,
    ServerError,
    CreateInvestigationParams,
    { previousData?: FindInvestigationsResponse; queryKey?: QueryKey }
  >(
    ['createInvestigation'],
    (investigation) => {
      const body = JSON.stringify(investigation);
      return http.post<CreateInvestigationResponse>(`/api/observability/investigations`, {
        body,
        version: '2023-10-31',
      });
    },

    {
      onSuccess: (response, investigation, context) => {
        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.useCreateInvestigation.successMessage', {
            defaultMessage: 'Investigation created',
          })
        );
        queryClient.invalidateQueries({ queryKey: investigationKeys.lists() });
      },
      onError: (error, investigation, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.useCreateInvestigation.errorMessage', {
                defaultMessage: 'an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.useCreateInvestigation.errorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
