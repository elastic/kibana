/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiKey } from '@kbn/security-plugin-types-common';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useGetApiKeys = () => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['apiKey'],
    queryFn: () =>
      http.fetch<{ apiKeys: ApiKey[]; canManageOwnApiKey: boolean }>(
        '/internal/serverless_search/api_keys'
      ),
  });
};
