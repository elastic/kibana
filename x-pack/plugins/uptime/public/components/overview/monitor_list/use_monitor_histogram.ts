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
import { fetchMonitorListHistogram } from '../../../state/api';
import { esKuerySelector } from '../../../state/selectors';

export const useMonitorHistogram = ({ items }: { items: MonitorSummary[] }) => {
  const { dateRangeStart, dateRangeEnd, statusFilter, query } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const filters = useSelector(esKuerySelector);

  const monitorIds = (items ?? []).map(({ monitor_id: monitorId }) => monitorId);

  const { data, loading } = useFetcher(() => {
    if (monitorIds.length > 0) {
      return fetchMonitorListHistogram(
        {
          dateRangeStart,
          dateRangeEnd,
          filters,
          statusFilter,
          query,
        },
        { monitorIds }
      );
    }
  }, [JSON.stringify(monitorIds), lastRefresh]);

  return { loading, ...(data ?? {}) };
};
