/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { GenerateConfigurationResponse } from '../../common/http_api/configuration';

export const useGenerateSchema = () => {
  const {
    services: { http, notifications },
  } = useKibana<CoreStart>();
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({ indexName }: { indexName: string }) => {
      const response = await http.post<GenerateConfigurationResponse>(
        '/internal/wci-index-source/configuration/generate',
        {
          body: JSON.stringify({ indexName }),
        }
      );
      return response.definition;
    },
    onError: (err: any) => {
      notifications.toasts.addError(err, { title: 'Error generating schema' });
    },
  });

  return {
    isLoading,
    generateSchema: mutate,
  };
};
