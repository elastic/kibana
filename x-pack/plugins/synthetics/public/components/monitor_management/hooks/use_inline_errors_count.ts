/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { monitorManagementListSelector, selectDynamicSettings } from '../../../state/selectors';
import { useEsSearch } from '../../../../../observability/public';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';
import { getInlineErrorFilters } from './use_inline_errors';

export function useInlineErrorsCount() {
  const monitorList = useSelector(monitorManagementListSelector);

  const { settings } = useSelector(selectDynamicSettings);

  const { lastRefresh } = useUptimeRefreshContext();

  const { data, loading } = useEsSearch(
    {
      index: settings?.heartbeatIndices,
      body: {
        size: 0,
        query: {
          bool: {
            filter: getInlineErrorFilters(),
          },
        },
        aggs: {
          total: {
            cardinality: { field: 'config_id' },
          },
        },
      },
    },
    [settings?.heartbeatIndices, monitorList, lastRefresh],
    { name: 'getInvalidMonitorsCount' }
  );

  return useMemo(() => {
    const errorSummariesCount = data?.aggregations?.total.value;

    return { loading, count: errorSummariesCount };
  }, [data, loading]);
}
