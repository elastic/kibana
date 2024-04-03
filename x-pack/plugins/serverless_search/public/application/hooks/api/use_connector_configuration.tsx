/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useEditConnectorConfiguration = (connectorId: string) => {
  const { http } = useKibanaServices();
  return useMutation({
    mutationFn: async (configuration: Record<string, string | number | boolean | null>) => {
      const body = { configuration };
      const result = await http.post(
        `/internal/serverless_search/connectors/${connectorId}/configuration`,
        {
          body: JSON.stringify(body),
        }
      );
      return result;
    },
  });
};
