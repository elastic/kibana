/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { useKibana } from './use_kibana';
import { APIRoutes, ChatFormFields } from '../types';

interface UseApiKeyQueryParams {
  name: string;
  expiresInDays: number;
}

export const useCreateApiKeyQuery = () => {
  const { services } = useKibana();
  const { getValues } = useFormContext();

  const { data, isError, isLoading, isSuccess, mutateAsync } = useMutation({
    mutationFn: async ({ name, expiresInDays }: UseApiKeyQueryParams) => {
      const response = await services.http.post<{
        apiKey: { encoded: string; name: string; expiration: number };
      }>(APIRoutes.POST_API_KEY, {
        body: JSON.stringify({
          name,
          expiresInDays,
          indices: getValues(ChatFormFields.indices),
        }),
      });

      return response.apiKey.encoded;
    },
  });

  return {
    apiKey: data,
    isLoading,
    isSuccess,
    isError,
    action: mutateAsync,
  };
};
