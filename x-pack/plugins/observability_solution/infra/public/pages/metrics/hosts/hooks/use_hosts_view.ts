/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import createContainer from 'constate';
import { BoolQuery } from '@kbn/es-query';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useUnifiedSearchContext } from './use_unified_search';
import {
  GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsResponsePayload,
  InfraAssetMetricType,
} from '../../../../../common/http_api';
import { StringDateRange } from './use_unified_search_url_state';

const HOST_TABLE_METRICS: Array<{ type: InfraAssetMetricType }> = [
  { type: 'cpu' },
  { type: 'diskSpaceUsage' },
  { type: 'memory' },
  { type: 'memoryFree' },
  { type: 'normalizedLoad1m' },
  { type: 'rx' },
  { type: 'tx' },
];

const BASE_INFRA_METRICS_PATH = '/api/metrics/infra';

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const {
    services: { http, data, telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const abortCtrlRef = useRef(new AbortController());
  const [searchSessionId, setSearchSessionId] = useState(() => data.search.session.start());

  const baseRequest = useMemo(
    () =>
      createInfraMetricsRequest({
        dateRange: parsedDateRange,
        esQuery: buildQuery(),
        sourceId,
        limit: searchCriteria.limit,
      }),
    [buildQuery, parsedDateRange, sourceId, searchCriteria.limit]
  );

  const [state, refetch] = useAsyncFn(
    async () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      const start = performance.now();
      const metricsResponse = await http.post<GetInfraMetricsResponsePayload>(
        `${BASE_INFRA_METRICS_PATH}`,
        {
          signal: abortCtrlRef.current.signal,
          body: JSON.stringify(baseRequest),
        }
      );
      const duration = performance.now() - start;
      telemetry?.reportPerformanceMetricEvent(
        'infra_hosts_table_load',
        duration,
        { key1: 'data_load', value1: duration },
        { limit: searchCriteria.limit }
      );
      return metricsResponse;
    },
    [baseRequest, http],
    { loading: true }
  );

  useEffect(() => {
    refetch();
    setSearchSessionId(data.search.session.start());
  }, [data.search.session, refetch]);

  const { value, error, loading } = state;

  return {
    loading,
    error,
    hostNodes: value?.nodes ?? [],
    searchSessionId,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

/**
 * Helpers
 */

const createInfraMetricsRequest = ({
  esQuery,
  sourceId,
  dateRange,
  limit,
}: {
  esQuery: { bool: BoolQuery };
  sourceId: string;
  dateRange: StringDateRange;
  limit: number;
}): GetInfraMetricsRequestBodyPayload => ({
  type: 'host',
  query: esQuery,
  range: {
    from: dateRange.from,
    to: dateRange.to,
  },
  metrics: HOST_TABLE_METRICS,
  limit,
  sourceId,
});
