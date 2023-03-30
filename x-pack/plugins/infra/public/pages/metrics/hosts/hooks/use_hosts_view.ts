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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import createContainer from 'constate';
import { HttpSetup } from '@kbn/core-http-browser';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  GetHostsRequestParams,
  GetHostsResponsePayload,
  HostMetricType,
} from '../../../../../common/http_api/hosts';
import { InfraClientCoreStart } from '../../../../types';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useUnifiedSearchContext } from './use_unified_search';

const HOST_TABLE_METRICS: Array<{ type: HostMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpu' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

type HostsRequest = Omit<GetHostsRequestParams, 'limit'> & { limit: number };

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const { http } = useKibana<InfraClientCoreStart>().services;
  const { buildQuery, getDateRangeAsTimestamp } = useUnifiedSearchContext();

  const hostRequest = useMemo<HostsRequest & { requestTs: number }>(
    () => ({
      limit: 20,
      metrics: HOST_TABLE_METRICS,
      query: JSON.stringify(buildQuery()),
      sourceId,
      timeRange: getDateRangeAsTimestamp(),
      requestTs: Date.now(),
    }),
    [buildQuery, getDateRangeAsTimestamp, sourceId]
  );

  const abortCtrlRef = useRef(new AbortController());
  const [{ loading, error, value }, refetch] = useAsyncFn(
    (requestBody: HostsRequest) => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchAlertsCount({
        http,
        signal: abortCtrlRef.current.signal,
        requestBody,
      });
    },
    [http],
    { loading: true }
  );

  const fetch = useCallback(
    (newData?: Partial<HostsRequest>) => {
      refetch({ ...hostRequest, ...newData });
    },
    [hostRequest, refetch]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    fetch,
    loading,
    error,
    requestTs: hostRequest.requestTs,
    hostNodes: value?.hosts ?? [],
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

/**
 * Helpers
 */

interface FetchAlertsCountParams {
  http: HttpSetup;
  signal: AbortSignal;
  requestBody: HostsRequest;
}

async function fetchAlertsCount({
  http,
  signal,
  requestBody,
}: FetchAlertsCountParams): Promise<GetHostsResponsePayload> {
  return http.post<GetHostsResponsePayload>(`/api/metrics/hosts`, {
    signal,
    body: JSON.stringify(requestBody),
  });
}
