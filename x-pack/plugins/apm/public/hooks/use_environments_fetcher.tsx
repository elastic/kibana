/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from './use_fetcher';
import { SERVICE_ENVIRONMENT } from '@kbn/apm-plugin/common/es_fields/apm';
import { Environment } from '../../common/environment_rt';

export function useEnvironmentsFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      if (serviceName) {
        return callApmApi('GET /internal/apm/environments', {
          params: {
            query: {
              start,
              end,
              serviceName,
            },
          },
        });
      }
      return callApmApi('GET /internal/apm/suggestions', {
        params: {
          query: {
            start,
            end,
            fieldName: SERVICE_ENVIRONMENT,
            fieldValue: '',
          },
        },
      });
    },
    [start, end, serviceName]
  );

  return {
    environments: ((data as any)?.environments ||
      (data as any)?.terms ||
      []) as Environment[],
    status,
  };
}
