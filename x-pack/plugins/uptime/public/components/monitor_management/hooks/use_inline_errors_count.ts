/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { monitorManagementListSelector } from '../../../state/selectors';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';
import { getInlineErrorFilters } from './use_inline_errors';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';

export function useInlineErrorsCount() {
  const monitorList = useSelector(monitorManagementListSelector);

  const { lastRefresh } = useUptimeRefreshContext();

  const { data, loading } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
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
    [monitorList, lastRefresh],
    { name: 'getInvalidMonitorsCount' }
  );

  return useMemo(() => {
    const errorSummariesCount = data?.aggregations?.total.value;

    return { loading, count: errorSummariesCount };
  }, [data, loading]);
}
