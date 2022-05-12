/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from './use_fetcher';

export function useDynamicDataViewFetcher() {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/data_view/dynamic', {
      isCachable: true,
    });
  }, []);

  return {
    dataView: data?.dynamicDataView,
    status,
  };
}
