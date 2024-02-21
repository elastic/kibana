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

import { useCallback, useMemo, useRef, useState } from 'react';
import { BoolQuery } from '@kbn/es-query';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceContext } from '../../../../containers/metrics_source';
import {
  GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsResponsePayload,
  InfraAssetMetricType,
} from '../../../../../common/http_api';
import { ParsedQuery, ISOTimeRange } from '../machines/query_state';

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

export const useFetchHosts = ({
  parsedQuery,
  isoTimeRange,
}: {
  parsedQuery: ParsedQuery;
  isoTimeRange: ISOTimeRange;
}) => {
  const { sourceId } = useSourceContext();
  const {
    services: { http, data, telemetry },
  } = useKibanaContextForPlugin();
  const abortCtrlRef = useRef(new AbortController());
  const [searchSessionId, setSearchSessionId] = useState(() => data.search.session.start());

  const baseRequest = useMemo(
    () =>
      createInfraMetricsRequest({
        isoTimeRange,
        esQuery: parsedQuery,
        sourceId,
        limit: 500,
      }),
    [parsedQuery, isoTimeRange, sourceId]
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
        { limit: 500 }
      );
      return metricsResponse;
    },
    [baseRequest, http],
    { loading: true }
  );

  const fetchHosts = useCallback(() => {
    refetch();
    setSearchSessionId(data.search.session.start());
  }, [data.search.session, refetch]);

  const { value, error, loading } = state;

  return {
    fetchHosts,
    loading,
    error,
    hostNodes: value?.nodes ?? [],
    searchSessionId,
  };
};

/**
 * Helpers
 */

const createInfraMetricsRequest = ({
  esQuery,
  sourceId,
  isoTimeRange,
  limit,
}: {
  esQuery: { bool: BoolQuery };
  sourceId: string;
  isoTimeRange: ISOTimeRange;
  limit: number;
}): GetInfraMetricsRequestBodyPayload => ({
  type: 'host',
  query: esQuery,
  range: {
    from: isoTimeRange.from,
    to: isoTimeRange.to,
  },
  metrics: HOST_TABLE_METRICS,
  limit,
  sourceId,
});
