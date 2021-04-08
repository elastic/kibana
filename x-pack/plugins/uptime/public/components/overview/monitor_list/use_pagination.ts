/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { MonitorSummary } from '../../../../common/runtime_types/monitor';
import { useGetUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';
import { useFetcher } from '../../../../../observability/public';
import { fetchMonitorListPagination } from '../../../state/api';
import { esKuerySelector } from '../../../state/selectors';

export const usePagination = ({ items }: { items: MonitorSummary[] }) => {
  const { dateRangeStart, dateRangeEnd, statusFilter, query } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const filters = useSelector(esKuerySelector);

  const beforeMonitorId = items?.[0]?.monitor_id;

  const afterMonitorId = items?.[items.length - 1]?.monitor_id;

  const { data, loading } = useFetcher(() => {
    if (beforeMonitorId && afterMonitorId) {
      return fetchMonitorListPagination({
        dateRangeStart,
        dateRangeEnd,
        filters,
        beforeMonitorId,
        afterMonitorId,
        statusFilter: statusFilter || undefined,
        query,
      });
    }
  }, [beforeMonitorId, afterMonitorId, lastRefresh]);

  const { before, after } = data?.result?.aggregations ?? {};

  return {
    nextData: after?.buckets,
    previousData: before?.buckets,
    loading,
  };
};
