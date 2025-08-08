/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { useFetcher } from '../../../hooks/use_fetcher';

export function useEnvironmentSelect({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start: string;
  end: string;
}) {
  const [debouncedSearchValue, setDebouncedSearchValue] = useStateDebounced('');

  const { data, status: searchStatus } = useFetcher(
    (callApmApi) => {
      return debouncedSearchValue.trim() === ''
        ? Promise.resolve({ terms: [] })
        : callApmApi('GET /internal/apm/suggestions', {
            params: {
              query: {
                fieldName: SERVICE_ENVIRONMENT,
                fieldValue: debouncedSearchValue,
                serviceName,
                start,
                end,
              },
            },
          });
    },
    [debouncedSearchValue, start, end, serviceName]
  );

  const onSearchChange = (value: string) => {
    setDebouncedSearchValue(value);
  };

  return { data, searchStatus, onSearchChange };
}
