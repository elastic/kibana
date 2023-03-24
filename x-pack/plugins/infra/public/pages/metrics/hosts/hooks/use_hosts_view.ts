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
import { HttpSetup } from '@kbn/core-http-browser';
import { estypes } from '@elastic/elasticsearch';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { InfraClientCoreStart } from '../../../../types';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useSnapshot, type UseSnapshotRequest } from '../../inventory_view/hooks/use_snaphot';
import { useUnifiedSearchContext } from './use_unified_search';
import { StringDateRangeTimestamp } from './use_unified_search_url_state';

const HOST_TABLE_METRICS: Array<{ type: SnapshotMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpu' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const { http } = useKibana<InfraClientCoreStart>().services;
  const { buildQuery, getDateRangeAsTimestamp } = useUnifiedSearchContext();

  const baseRequest = useMemo(
    () =>
      createSnapshotRequest({
        dateRange: getDateRangeAsTimestamp(),
        esQuery: buildQuery(),
        sourceId,
      }),
    [buildQuery, getDateRangeAsTimestamp, sourceId]
  );

  const abortCtrlRef = useRef(new AbortController());
  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchAlertsCount({
        http,
        signal: abortCtrlRef.current.signal,
      });
    },
    [http],
    { loading: true }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Snapshot endpoint internally uses the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off of source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint to accept a new parameter for the indices
  const {
    loading,
    error,
    nodes: hostNodes,
  } = useSnapshot(
    {
      ...baseRequest,
      metrics: HOST_TABLE_METRICS,
    },
    { abortable: true }
  );

  return {
    baseRequest,
    loading,
    error,
    hostNodes,
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
}

async function fetchAlertsCount({ http, signal }: FetchAlertsCountParams): Promise<unknown> {
  return (
    http
      .post<estypes.SearchResponse<Record<string, unknown>>>(`/api/metrics/hosts`, {
        signal,
      })
      // eslint-disable-next-line no-console
      .then((res) => console.log('res', { res }))
  );
}

const createSnapshotRequest = ({
  esQuery,
  sourceId,
  dateRange,
}: {
  esQuery: { bool: BoolQuery };
  sourceId: string;
  dateRange: StringDateRangeTimestamp;
}): UseSnapshotRequest => ({
  filterQuery: JSON.stringify(esQuery),
  metrics: [],
  groupBy: [],
  nodeType: 'host',
  sourceId,
  currentTime: dateRange.to,
  includeTimeseries: false,
  sendRequestImmediately: true,
  timerange: {
    interval: '1m',
    from: dateRange.from,
    to: dateRange.to,
    ignoreLookback: true,
  },
  // The user might want to click on the submit button without changing the filters
  // This makes sure all child components will re-render.
  requestTs: Date.now(),
});
