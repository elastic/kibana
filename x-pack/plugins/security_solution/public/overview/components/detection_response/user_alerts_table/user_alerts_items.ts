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

const USERS_BY_SEVERITY_AGG = 'usersBySeverity';

interface TimeRange {
  from: string;
  to: string;
}

interface UseUserAlertsItemsProps {
  skip: boolean;
  queryId: string;
}

export interface AlertSeverityCounts {
  userName: string;
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

interface AlertCountersBySeverityAggregation {
  [USERS_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
}

interface UseVulnerableUsersCountersReturnType {
  isLoading: boolean;
  data: AlertSeverityCounts[];
}

export const useUserAlertsItems = ({
  skip,
  queryId,
}: UseUserAlertsItemsProps): UseVulnerableUsersCountersReturnType => {
  const { to, from, setQuery: globalSetQuery, deleteQuery } = useGlobalTime();
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const {
    setQuery,
    data,
    loading: isLoadingData,
    refetch: refetchQuery,
    request,
    response,
  } = useQueryAlerts<{}, AlertCountersBySeverityAggregation>({
    query: buildVulnerableUserAggregationQuery({ from, to }),
    indexName: signalIndexName,
    skip,
  });

  const isLoading = isLoadingData && isSignalIndexLoading;

  useEffect(() => {
    setQuery(buildVulnerableUserAggregationQuery({ from, to }));
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

export const buildVulnerableUserAggregationQuery = ({ from, to }: TimeRange) => ({
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
    [USERS_BY_SEVERITY_AGG]: {
      terms: {
        field: 'user.name',
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
  rawAggregation: AlertCountersBySeverityAggregation
): AlertSeverityCounts[] {
  const buckets = rawAggregation?.[USERS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<AlertSeverityCounts[]>((accumalatedAlertsByUser, currentUser) => {
    return [
      ...accumalatedAlertsByUser,
      {
        userName: currentUser.key,
        totalAlerts: currentUser.doc_count,
        low: currentUser.low.doc_count,
        medium: currentUser.medium.doc_count,
        high: currentUser.high.doc_count,
        critical: currentUser.critical.doc_count,
      },
    ];
  }, []);
}
