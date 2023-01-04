/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { useInspectButton } from '../../common/hooks';
import type { AlertsByHostAgg, HostData, UseAlertsQueryProps } from '../types';
import { DEFAULT_QUERY_SIZE, parseHostData, getAlertsQuery } from '../helpers';

const aggregations = {
  alertsByHost: {
    terms: {
      field: 'host.name',
      size: DEFAULT_QUERY_SIZE,
    },
  },
};

export type UseAlertsByHost = (props: UseAlertsQueryProps) => {
  items: HostData[] | null;
  isLoading: boolean;
  updatedAt: number;
};

export const useHostNameChartData: UseAlertsByHost = ({
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
  const [items, setItems] = useState<null | HostData[]>(null);

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
  } = useQueryAlerts<{}, AlertsByHostAgg>({
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
  }, [setAlertsQuery, from, to, entityFilter, additionalFilters, runtimeMappings]);

  useEffect(() => {
    if (data == null) {
      setItems(null);
    } else {
      setItems(parseHostData(data));
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
