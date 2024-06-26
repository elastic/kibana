/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';

interface MutationArgs {
  type: string;
  id: string;
}

export const useDeleteEndpoint = () => {
  const queryClient = useQueryClient();
  const { services } = useKibana();

  return useMutation(
    async ({ type, id }: MutationArgs) => {
      await services.http.delete<{}>(`/internal/inference_endpoint/endpoints/${type}/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
      },
    }
  );
};

export type UseDeleteEndpoint = ReturnType<typeof useDeleteEndpoint>;
