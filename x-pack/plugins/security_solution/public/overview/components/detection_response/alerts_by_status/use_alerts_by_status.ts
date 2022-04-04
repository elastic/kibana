/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { parseAlertsData } from './utils';
import { AlertsByStatusAgg } from './types';

export const getAlertsByStatusQuery = ({ from, to }: { from: string; to: string }) => ({
  size: 0,
  query: {
    bool: {
      filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
    },
  },
  aggs: {
    alertsByStatus: {
      terms: {
        field: 'kibana.alert.workflow_status',
      },
      aggs: {
        statusBySeverity: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
    },
  },
});

export const useAlertsByStatus = ({
  signalIndexName,
  queryId,
}: {
  signalIndexName: string | null;
  queryId: string;
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id

  const {
    loading: isLoading,
    data,
    setQuery: setAlertsQuery,
    response,
    request,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
    }),
    indexName: signalIndexName,
  });

  const items = useMemo(() => {
    if (data == null) {
      return [];
    }
    return parseAlertsData(data);
  }, [data]);

  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
      })
    );
  }, [setAlertsQuery, from, to]);

  const refetch = useCallback(() => {
    if (refetchQuery) {
      refetchQuery();
    }
  }, [refetchQuery]);

  useQueryInspector({
    deleteQuery,
    inspect: {
      dsl: [request],
      response: [response],
    },
    refetch,
    setQuery,
    queryId,
    loading: isLoading,
  });

  return { items, isLoading, queryId };
};
