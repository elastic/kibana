/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../../common/es_fields/apm';
import { useFetcher } from './use_fetcher';
import { Environment } from '../../common/environment_rt';

const INITIAL_DATA = { environments: [] };

export function useEnvironmentsFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  if (serviceName) {
    return getEnvironmentsForGivenService(start, end, serviceName);
  }

  return getEnvironmentsUsingSuggestionsApi(start, end);
}

const getEnvironmentsForGivenService = (
  start?: string,
  end?: string,
  serviceName?: string
) => {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
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
    },
    [start, end, serviceName]
  );

  return { environments: data.environments, status };
};

const getEnvironmentsUsingSuggestionsApi = (start?: string, end?: string) => {
  const { data = { terms: [] }, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
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
      }
    },
    [start, end]
  );

  return { environments: data.terms as Environment[], status };
};
