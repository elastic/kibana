/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useUrlParams } from '../../../../hooks/useUrlParams';

export function useUxQuery() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm, percentile } = urlParams;

  const queryParams = useMemo(() => {
    const { serviceName } = uiFilters;

    if (start && end && serviceName && percentile) {
      return {
        start,
        end,
        percentile: String(percentile),
        urlQuery: searchTerm || undefined,
        uiFilters: JSON.stringify(uiFilters),
      };
    }

    return null;
  }, [start, end, searchTerm, percentile, uiFilters]);

  return queryParams;
}
