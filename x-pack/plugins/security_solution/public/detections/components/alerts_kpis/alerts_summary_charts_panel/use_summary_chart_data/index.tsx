/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { SummaryChartsAgg, SummaryChartsData, UseAlertsQueryProps } from '../types';
import type { EntityFilter } from '../../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { useInspectButton } from '../../common/hooks';
import { parseData } from '../helpers';

export type UseAlerts = (props: UseAlertsQueryProps) => {
  items: SummaryChartsData[] | null;
  isLoading: boolean;
  updatedAt: number;
};

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
  aggregationType,
  aggregations,
  uniqueQueryId,
  entityFilter,
  query,
  filters,
  runtimeMappings,
  signalIndexName,
  skip = false,
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime(false);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<null | SummaryChartsData[]>(null);

  const additionalFilters = useMemo(() => {
    try {
      return [
        buildEsQuery(
          undefined,
          query != null ? [query] : [],
          filters?.filter((f) => f.meta.disabled === false) ?? []
        ),
      ];
    } catch (e) {
      return [];
    }
  }, [query, filters]);

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
      setItems(null);
    } else {
      setItems(parseData(aggregationType, data));
    }
    setUpdatedAt(Date.now());
  }, [data, aggregationType]);

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
