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

import { useMemo } from 'react';
import createContainer from 'constate';
import { SnapshotNode } from '../../../../../common/http_api';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useSnapshot, UseSnapshotRequest } from '../../inventory_view/hooks/use_snaphot';
import { useUnifiedSearchContext } from './use_unified_search';
import { HostsState } from './use_unified_search_url_state';

const HOST_TABLE_METRICS: Array<{ type: SnapshotMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpuCores' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const { buildQuery, getDateRangeAsTimestamp, unifiedSearchDateRange } = useUnifiedSearchContext();

  const baseRequest = useMemo(() => {
    const esQuery = buildQuery();
    const { from, to } = getDateRangeAsTimestamp();

    const snapshotRequest: UseSnapshotRequest = {
      filterQuery: esQuery ? JSON.stringify(esQuery) : null,
      metrics: [],
      groupBy: [],
      nodeType: 'host',
      sourceId,
      currentTime: to,
      includeTimeseries: false,
      sendRequestImmediately: true,
      timerange: {
        interval: '1m',
        from,
        to,
        ignoreLookback: true,
      },
      // The user might want to click on the submit button without changing the filters
      // This makes sure all child components will re-render.
      requestTs: Date.now(),
    };
    return snapshotRequest;
  }, [buildQuery, getDateRangeAsTimestamp, sourceId]);

  // Snapshot endpoint internally uses the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off of source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint to accept a new parameter for the indices
  const {
    loading,
    error,
    nodes: hostNodes,
  } = useSnapshot({ ...baseRequest, metrics: HOST_TABLE_METRICS });

  const alertsEsQueryFilter = useMemo(
    () => createAlertsQueryFilter({ hostNodes, dateRange: unifiedSearchDateRange }),
    [hostNodes, unifiedSearchDateRange]
  );

  return {
    alertsEsQueryFilter,
    baseRequest,
    loading,
    error,
    hostNodes,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

interface AlertsQueryParams {
  hostNodes: SnapshotNode[];
  dateRange: HostsState['dateRange'];
}

const createAlertsQueryFilter = ({ hostNodes, dateRange }: AlertsQueryParams) => ({
  bool: {
    must: [],
    filter: [createTimestampFilter(dateRange), createHostsFilter(hostNodes)],
    should: [],
    must_not: [],
  },
});

const createTimestampFilter = (date: AlertsQueryParams['dateRange']) => ({
  range: {
    '@timestamp': {
      gte: date.from,
      lte: date.to,
    },
  },
});

const createHostsFilter = (hosts: AlertsQueryParams['hostNodes']) => ({
  bool: {
    should: hosts.map(createHostCondition),
    minimum_should_match: 1,
  },
});

const createHostCondition = (host: SnapshotNode) => ({
  bool: {
    should: [
      {
        match_phrase: {
          'host.name': host.name,
        },
      },
    ],
    minimum_should_match: 1,
  },
});
