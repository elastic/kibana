/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { GenericBuckets } from '../../../../../common/search_strategy';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';

const HOSTS_BY_SEVERITY_AGG = 'hostsBySeverity';

interface TimeRange {
  from: string;
  to: string;
}

interface UseHostsAlertsItemsProps {
  skip: boolean;
  queryId: string;
}
export interface AlertSeverityCounts {
  hostName: string;
  totalAlerts: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface SeverityContainer {
  doc_count: number;
}
interface AlertBySeverityBucketData extends GenericBuckets {
  low: SeverityContainer;
  medium: SeverityContainer;
  high: SeverityContainer;
  critical: SeverityContainer;
}

interface AlertCountersBySeverityAndSeverityAggregation {
  [HOSTS_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
}

interface UseVulnerableHostsCountersReturnType {
  isLoading: boolean;
  data: AlertSeverityCounts[];
}

export const useHostAlertsItems = ({
  skip,
  queryId,
}: UseHostsAlertsItemsProps): UseVulnerableHostsCountersReturnType => {
  const { to, from, setQuery: globalSetQuery, deleteQuery } = useGlobalTime();
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const {
    data,
    request,
    response,
    setQuery,
    loading: isLoadingData,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, AlertCountersBySeverityAndSeverityAggregation>({
    query: buildVulnerableHostAggregationQuery({ from, to }),
    indexName: signalIndexName,
    skip,
  });

  const isLoading = isLoadingData && isSignalIndexLoading;

  useEffect(() => {
    setQuery(buildVulnerableHostAggregationQuery({ from, to }));
  }, [setQuery, from, to]);

  const transformedResponse: AlertSeverityCounts[] = useMemo(() => {
    if (data && !!data.aggregations) {
      return pickOffCounters(data.aggregations);
    }
    return [];
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
    setQuery: globalSetQuery,
    queryId,
    loading: isLoading,
  });
  return { isLoading, data: transformedResponse };
};

export const buildVulnerableHostAggregationQuery = ({ from, to }: TimeRange) => ({
  query: {
    bool: {
      filter: [
        {
          term: {
            'kibana.alert.workflow_status': 'open',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  size: 0,
  aggs: {
    [HOSTS_BY_SEVERITY_AGG]: {
      terms: {
        field: 'host.name',
        order: [
          {
            'critical.doc_count': 'desc',
          },
          {
            'high.doc_count': 'desc',
          },
          {
            'medium.doc_count': 'desc',
          },
          {
            'low.doc_count': 'desc',
          },
        ],
        size: 4,
      },
      aggs: {
        critical: {
          filter: {
            term: {
              'kibana.alert.severity': 'critical',
            },
          },
        },
        high: {
          filter: {
            term: {
              'kibana.alert.severity': 'high',
            },
          },
        },
        medium: {
          filter: {
            term: {
              'kibana.alert.severity': 'medium',
            },
          },
        },
        low: {
          filter: {
            term: {
              'kibana.alert.severity': 'low',
            },
          },
        },
      },
    },
  },
});

function pickOffCounters(
  rawAggregation: AlertCountersBySeverityAndSeverityAggregation
): AlertSeverityCounts[] {
  const buckets = rawAggregation?.[HOSTS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<AlertSeverityCounts[]>((accumalatedAlertsByHost, currentHost) => {
    return [
      ...accumalatedAlertsByHost,
      {
        hostName: currentHost.key,
        totalAlerts: currentHost.doc_count,
        low: currentHost.low.doc_count,
        medium: currentHost.medium.doc_count,
        high: currentHost.high.doc_count,
        critical: currentHost.critical.doc_count,
      },
    ];
  }, []);
}
