/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../../common/es_fields/apm';
import { useFetcher } from './use_fetcher';
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
        }).then((response) => {
          // Spreading of original response is needed in order to display the api call in the inspector
          return { ...response, environments: response.environments };
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
      }).then((response) => {
        return { ...response, environments: response.terms };
      });
    },
    [start, end, serviceName]
  );

  return {
    environments: (data?.environments ?? []) as Environment[],
    status,
  };
}
