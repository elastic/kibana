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
  const { buildQuery, getDateRangeAsTimestamp, searchCriteria } = useUnifiedSearchContext();

  const hostRequest = useMemo<HostsRequest>(
    () => ({
      limit: searchCriteria.limit,
      metrics: HOST_TABLE_METRICS,
      query: buildQuery(),
      timeRange: getDateRangeAsTimestamp(),
      sortField: 'name',
      sortDirection: 'asc',
      sourceId,
    }),
    [searchCriteria.limit, buildQuery, getDateRangeAsTimestamp, sourceId]
  );

  const abortCtrlRef = useRef(new AbortController());
  const [{ loading, error, value }, refetch] = useAsyncFn(
    (requestBody: HostsRequest) => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return http.post<GetHostsResponsePayload>(`/api/metrics/hosts`, {
        signal: abortCtrlRef.current.signal,
        body: JSON.stringify(requestBody),
      });
    },
    [http],
    { loading: true }
  );

  const fetch = useCallback(
    (newData?: Partial<HostsRequest>) => {
      return refetch({ ...hostRequest, ...newData });
    },
    [hostRequest, refetch]
  );

  const getSortedHostNames = useCallback(
    () => (value?.hosts ?? []).map((p) => p.name).sort(),
    [value?.hosts]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    fetch,
    loading,
    error,
    getSortedHostNames,
    hostNodes: value?.hosts ?? [],
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;
