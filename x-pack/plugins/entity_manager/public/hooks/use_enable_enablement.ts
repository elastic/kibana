/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityManagerEnablementResponse } from '@kbn/entities-schema';
import { IHttpFetchError } from '@kbn/core/public';
import { useKibana } from './use_kibana';
import { entityManagerKeys } from './query_key_factory';
type ServerError = IHttpFetchError<EntityManagerEnablementResponse>;

export function useEnableEnablement() {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;
  return useMutation<EntityManagerEnablementResponse, ServerError>({
    mutationFn: () =>
      http.put<EntityManagerEnablementResponse>('/internal/entities/managed/enablement'),
    onSuccess: () => {
      queryClient.invalidateQueries(entityManagerKeys.enablement());
      queryClient.invalidateQueries(entityManagerKeys.definitions());
    },
  });
}
