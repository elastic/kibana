/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { AlertsByStatusAgg, AlertsByStatusResponse, ParsedAlertsData } from './types';
import {
  STATUS_CRITICAL_LABEL,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
} from '../translations';

export const severityLabels: Record<Severity, string> = {
  critical: STATUS_CRITICAL_LABEL,
  high: STATUS_HIGH_LABEL,
  medium: STATUS_MEDIUM_LABEL,
  low: STATUS_LOW_LABEL,
};

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
          label: severityLabels[severityBucket.key],
        })),
      },
    };
  }, {});
};

export interface UseAlertsByStatusProps {
  queryId: string;
  signalIndexName: string | null;
  skip?: boolean;
}

export type UseAlertsByStatus = (props: UseAlertsByStatusProps) => {
  items: ParsedAlertsData;
  isLoading: boolean;
  updatedAt: number;
};

export const useAlertsByStatus: UseAlertsByStatus = ({
  queryId,
  signalIndexName,
  skip = false,
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<null | ParsedAlertsData>(null);

  const {
    data,
    loading: isLoading,
    refetch: refetchQuery,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
    }),
    indexName: signalIndexName,
    skip,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
      })
    );
  }, [setAlertsQuery, from, to]);

  useEffect(() => {
    if (data == null) {
      setItems(null);
    } else {
      setItems(parseAlertsData(data));
    }
    setUpdatedAt(Date.now());
  }, [data]);

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

  return { items, isLoading, updatedAt };
};
