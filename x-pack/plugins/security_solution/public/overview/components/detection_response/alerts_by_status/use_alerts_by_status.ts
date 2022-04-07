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
import { AlertsByStatusAgg, AlertsByStatusResponse, ParsedAlertsData } from './types';

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

export const parseAlertsData = (
  response: AlertsByStatusResponse<{}, AlertsByStatusAgg>
): ParsedAlertsData => {
  const statusBuckets = response?.aggregations?.alertsByStatus?.buckets ?? [];

  if (statusBuckets.length === 0) {
    return null;
  }

  return statusBuckets.reduce<ParsedAlertsData>((parsedAlertsData, statusBucket) => {
    const severityBuckets = statusBucket.statusBySeverity?.buckets ?? [];

    return {
      ...parsedAlertsData,
      [statusBucket.key]: {
        total: statusBucket.doc_count,
        severities: severityBuckets.map((severityBucket) => ({
          key: severityBucket.key,
          value: severityBucket.doc_count,
        })),
      },
    };
  }, {});
};

export const useAlertsByStatus = ({
  signalIndexName,
  queryId,
  skip = false,
}: {
  signalIndexName: string | null;
  queryId: string;
  skip?: boolean;
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();

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
    skip,
  });

  const items = useMemo(() => {
    if (data == null) {
      return null;
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
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

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

  return { items, isLoading };
};
