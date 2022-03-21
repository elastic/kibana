/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import { SERVICE_ENVIRONMENT } from '../../common/elasticsearch_fieldnames';

function getEnvironmentOptions(environments: string[]) {
  const environmentOptions = environments.map((environment) => ({
    value: environment,
    label: environment,
  }));

  return environmentOptions;
}

const INITIAL_DATA = { terms: [] };

export function useEnvironmentsFetcher({
  serviceName,
  start,
  end,
  fieldValue,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
  fieldValue?: string;
}) {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi('GET /internal/apm/suggestions_by_service_name', {
          params: {
            query: {
              serviceName,
              start,
              end,
              fieldName: SERVICE_ENVIRONMENT,
              fieldValue: fieldValue ?? '',
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
            fieldValue: fieldValue ?? '',
          },
        },
      });
    },
    [start, end, serviceName, fieldValue]
  );

  const environmentOptions = useMemo(
    () => getEnvironmentOptions(data.terms),
    [data.terms]
  );

  return { environments: data.terms, status, environmentOptions };
}
