/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { SummaryChartsAgg, SummaryChartsData } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import type { EntityFilter } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
import { useInspectButton } from '../common/hooks';
import { parseData } from './helpers';

export type UseAlerts = (props: UseAlertsQueryProps) => {
  items: SummaryChartsData[];
  isLoading: boolean;
  updatedAt: number;
};

export interface UseAlertsQueryProps {
  aggregations: {};
  uniqueQueryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  entityFilter?: EntityFilter;
  query?: Query;
  filters?: Filter[];
  runtimeMappings?: MappingRuntimeFields;
}

export const getAlertsQuery = ({
  additionalFilters = [],
  from,
  to,
  entityFilter,
  runtimeMappings,
  aggregations,
}: {
  from: string;
  to: string;
  entityFilter?: EntityFilter;
  additionalFilters?: ESBoolQuery[];
  runtimeMappings?: MappingRuntimeFields;
  aggregations: {};
}) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        { range: { '@timestamp': { gte: from, lte: to } } },
        ...(entityFilter
          ? [
              {
                term: {
                  [entityFilter.field]: entityFilter.value,
                },
              },
            ]
          : []),
      ],
    },
  },
  aggs: aggregations,
  runtime_mappings: runtimeMappings,
});

export const useSummaryChartData: UseAlerts = ({
  aggregations,
  uniqueQueryId,
  entityFilter,
  query,
  filters,
  runtimeMappings,
  signalIndexName,
  skip = false,
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<SummaryChartsData[]>([]);

  const { uiSettings } = useKibana().services;
  const additionalFilters = useMemo(() => {
    try {
      const config = getEsQueryConfig(uiSettings);
      return [
        buildEsQuery(
          undefined,
          query != null ? [query] : [],
          filters?.filter((f) => f.meta.disabled === false) ?? [],
          config
        ),
      ];
    } catch (e) {
      return [];
    }
  }, [query, filters, uiSettings]);

  const {
    data,
    loading: isLoading,
    refetch: refetchQuery,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, SummaryChartsAgg>({
    query: getAlertsQuery({
      from,
      to,
      entityFilter,
      additionalFilters,
      runtimeMappings,
      aggregations,
    }),
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.COUNT,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsQuery({
        from,
        to,
        entityFilter,
        additionalFilters,
        runtimeMappings,
        aggregations,
      })
    );
  }, [setAlertsQuery, from, to, entityFilter, additionalFilters, runtimeMappings, aggregations]);

  useEffect(() => {
    if (data == null) {
      setItems([]);
    } else {
      setItems(parseData(data));
    }
    setUpdatedAt(Date.now());
  }, [data]);

  const refetch = useCallback(() => {
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

  useInspectButton({
    deleteQuery,
    loading: isLoading,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId,
  });

  return { items, isLoading, updatedAt };
};
