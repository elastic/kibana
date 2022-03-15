/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@elastic/datemath';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import type {
  MetricsExplorerResponse,
  MetricsExplorerSeries,
} from '../../../../../common/http_api/metrics_explorer';
import { useSourceContext } from '../../../../containers/metrics_source';
import type {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';

export interface SortState<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

interface UseInfrastructureNodeMetricsOptions<T> {
  metricsExplorerOptions: MetricsExplorerOptions;
  timerange: Pick<MetricsExplorerTimeOptions, 'from' | 'to'>;
  filterClauseDsl?: QueryDslQueryContainer;
  transform: (series: MetricsExplorerSeries) => T;
  sortState: SortState<T>;
  currentPageIndex: number;
}

const NODE_COUNT_LIMIT = 10000;
const TOTAL_NODES_LIMIT = 100;
const TABLE_PAGE_SIZE = 10;
const nullData: MetricsExplorerResponse = {
  series: [],
  pageInfo: {
    afterKey: null,
    total: -1,
  },
};

export const useInfrastructureNodeMetrics = <T>(
  options: UseInfrastructureNodeMetricsOptions<T>
) => {
  const {
    metricsExplorerOptions,
    timerange,
    filterClauseDsl,
    transform,
    sortState,
    currentPageIndex,
  } = options;

  const [transformedNodes, setTransformedNodes] = useState<T[]>([]);
  const fetch = useKibanaHttpFetch();
  const { source, isLoadingSource } = useSourceContext();
  const timerangeWithInterval = useTimerangeWithInterval(timerange);

  const [{ state: promiseState }, fetchNodes] = useTrackedPromise(
    {
      createPromise: (): Promise<MetricsExplorerResponse> => {
        if (!source) {
          return Promise.resolve(nullData);
        }

        const request = {
          metrics: metricsExplorerOptions.metrics,
          groupBy: metricsExplorerOptions.groupBy,
          limit: NODE_COUNT_LIMIT,
          indexPattern: source.configuration.metricAlias,
          filterQuery: JSON.stringify(filterClauseDsl),
          timerange: timerangeWithInterval,
        };

        return fetch('/api/infra/metrics_explorer', {
          method: 'POST',
          body: JSON.stringify(request),
        });
      },
      onResolve: (response: MetricsExplorerResponse) => {
        setTransformedNodes(response.series.map(transform));
      },
      onReject: (error) => {
        // What to do about this?
        // eslint-disable-next-line no-console
        console.log(error);
      },
      cancelPreviousOn: 'creation',
    },
    [source, metricsExplorerOptions, timerangeWithInterval, filterClauseDsl]
  );
  const isLoadingNodes = promiseState === 'pending' || promiseState === 'uninitialized';

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const sortedNodes = useMemo(() => {
    return [...transformedNodes].sort(makeSortNodes(sortState));
  }, [transformedNodes, sortState]);

  const top100Nodes = useMemo(() => {
    return sortedNodes.slice(0, TOTAL_NODES_LIMIT);
  }, [sortedNodes]);

  const nodes = useMemo(() => {
    const pageStartIndex = currentPageIndex * TABLE_PAGE_SIZE;
    const pageEndIndex = pageStartIndex + TABLE_PAGE_SIZE;
    return top100Nodes.slice(pageStartIndex, pageEndIndex);
  }, [top100Nodes, currentPageIndex]);

  const pageCount = useMemo(() => Math.ceil(top100Nodes.length / TABLE_PAGE_SIZE), [top100Nodes]);

  return {
    isLoading: isLoadingSource || isLoadingNodes,
    nodes,
    pageCount,
  };
};

function useKibanaHttpFetch() {
  const kibana = useKibana();
  const fetch = kibana.services.http?.fetch;

  if (!fetch) {
    throw new Error('Could not find Kibana HTTP fetch');
  }

  return fetch;
}

function useTimerangeWithInterval(timerange: Pick<MetricsExplorerTimeOptions, 'from' | 'to'>) {
  return useMemo(() => {
    const from = parse(timerange.from);
    const to = parse(timerange.to);

    if (!from || !to) {
      throw new Error('Could not parse timerange');
    }

    return { from: from.valueOf(), to: to.valueOf(), interval: 'modules' };
  }, [timerange]);
}

function makeSortNodes<T>(sortState: SortState<T>) {
  return (nodeA: T, nodeB: T) => {
    const nodeAValue = nodeA[sortState.field];
    const nodeBValue = nodeB[sortState.field];

    if (typeof nodeAValue === 'string' && typeof nodeBValue === 'string') {
      if (sortState.direction === 'asc') {
        return nodeAValue.localeCompare(nodeBValue);
      } else {
        return nodeBValue.localeCompare(nodeAValue);
      }
    }

    if (typeof nodeAValue === 'number' && typeof nodeBValue === 'number') {
      if (sortState.direction === 'asc') {
        return nodeAValue - nodeBValue;
      } else {
        return nodeBValue - nodeAValue;
      }
    }

    return 0;
  };
}
