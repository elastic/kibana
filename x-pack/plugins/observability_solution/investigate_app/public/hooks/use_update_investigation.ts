/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { UpdateInvestigationParams, UpdateInvestigationResponse } from '@kbn/investigation-shared';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateInvestigation() {
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
      onSuccess: (response, {}) => {
        toasts.addSuccess('Investigation updated');
      },
      onError: (error, {}, context) => {
        toasts.addError(new Error(error.body?.message ?? 'An error occurred'), { title: 'Error' });
      },
    }
  );
}
