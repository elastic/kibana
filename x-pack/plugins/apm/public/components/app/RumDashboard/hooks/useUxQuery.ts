/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';

export function useUxQuery() {
  const { urlParams, uxUiFilters } = useUrlParams();

  const { start, end, searchTerm, percentile } = urlParams;

  const queryParams = useMemo(() => {
    const { serviceName } = uxUiFilters;

    if (start && end && serviceName && percentile) {
      return {
        start,
        end,
        percentile: String(percentile),
        urlQuery: searchTerm || undefined,
        uiFilters: JSON.stringify(uxUiFilters),
      };
    }

    return null;
  }, [start, end, searchTerm, percentile, uxUiFilters]);

  return queryParams;
}
