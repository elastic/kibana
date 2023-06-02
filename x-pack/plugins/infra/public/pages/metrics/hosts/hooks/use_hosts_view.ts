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

import { useEffect, useMemo, useRef } from 'react';
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
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpu' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

const BASE_INFRA_METRICS_PATH = '/api/metrics/infra';

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const {
    services: { http },
  } = useKibanaContextForPlugin();
  const { buildQuery, getParsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const abortCtrlRef = useRef(new AbortController());

  const baseRequest = useMemo(
    () =>
      createInfraMetricsRequest({
        dateRange: getParsedDateRange(),
        esQuery: buildQuery(),
        sourceId,
        limit: searchCriteria.limit,
      }),
    [buildQuery, getParsedDateRange, sourceId, searchCriteria.limit]
  );

  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      return http.post<GetInfraMetricsResponsePayload>(`${BASE_INFRA_METRICS_PATH}`, {
        signal: abortCtrlRef.current.signal,
        body: JSON.stringify(baseRequest),
      });
    },
    [baseRequest, http],
    { loading: true }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { value, error, loading } = state;

  return {
    requestTs: baseRequest.requestTs,
    loading,
    error,
    hostNodes: value?.nodes ?? [],
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
}): GetInfraMetricsRequestBodyPayload & { requestTs: number } => ({
  type: 'host',
  query: esQuery,
  range: {
    from: dateRange.from,
    to: dateRange.to,
  },
  metrics: HOST_TABLE_METRICS,
  limit,
  sourceId,
  requestTs: Date.now(),
});
