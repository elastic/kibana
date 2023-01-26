/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { buildEsQuery } from '@kbn/es-query';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Filter, Query } from '@kbn/es-query';
import type { AlertsBySeverityAgg, EntityFilter, ParsedSeverityData } from '../types';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { useInspectButton } from '../../common/hooks';
import { parseSeverityAlerts } from '../helpers';

export const getAlertsBySeverityQuery = ({
  additionalFilters = [],
  from,
  to,
  entityFilter,
  runtimeMappings,
}: {
  from: string;
  to: string;
  entityFilter?: EntityFilter;
  additionalFilters?: ESBoolQuery[];
  runtimeMappings?: MappingRuntimeFields;
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
  aggs: {
    statusBySeverity: {
      terms: {
        field: ALERT_SEVERITY,
      },
    },
  },
  runtime_mappings: runtimeMappings,
});

export interface UseSeverityChartProps {
  uniqueQueryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  entityFilter?: EntityFilter;
  query?: Query;
  filters?: Filter[];
  runtimeMappings?: MappingRuntimeFields;
}

export type UseAlertsBySeverity = (props: UseSeverityChartProps) => {
  items: ParsedSeverityData;
  isLoading: boolean;
  updatedAt: number;
};

export const useSeverityChartData: UseAlertsBySeverity = ({
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
  const [items, setItems] = useState<null | ParsedSeverityData>(null);
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
  } = useQueryAlerts<{}, AlertsBySeverityAgg>({
    query: getAlertsBySeverityQuery({
      from,
      to,
      entityFilter,
      additionalFilters,
      runtimeMappings,
    }),
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.COUNT,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsBySeverityQuery({
        from,
        to,
        entityFilter,
        additionalFilters,
        runtimeMappings,
      })
    );
  }, [setAlertsQuery, from, to, entityFilter, additionalFilters, runtimeMappings]);

  useEffect(() => {
    if (data == null) {
      setItems(null);
    } else {
      setItems(parseSeverityAlerts(data));
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
