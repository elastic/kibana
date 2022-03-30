/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { GenericBuckets } from '../../../../../common/search_strategy';
import { AlertSearchResponse } from '../../../../detections/containers/detection_engine/alerts/types';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';

const ID = 'vulnerableUsersBySeverityQuery';
const USERS_BY_SEVERITY_AGG = 'usersBySeverity';

interface TimeRange {
  from: string;
  to: string;
}

interface AlertSeverityCounts {
  userName: string;
  count: number;
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

interface AlertsCounterResult {
  counters: AlertSeverityCounts[];
  id: string;
  inspect: { dsl: string; response: string };
  isInspected: boolean;
}

interface UseVulnerableUsersCountersReturnType {
  isLoading: boolean;
  data: AlertsCounterResult;
  refetch: (() => Promise<void>) | null;
}

export const useVulnerableUsersCounters = ({
  from,
  to,
}: TimeRange): UseVulnerableUsersCountersReturnType => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const {
    setQuery,
    loading: isLoadingData,
    refetch,
    ...result
  } = useQueryAlerts<{}, AlertCountersBySeverityAggregation>({
    query: buildVulnerableHostAggregationQuery({ from, to }),
    indexName: signalIndexName,
  });

  const transformedResponse = useMemo(
    () => ({
      id: ID,
      counters: pickOffCounters(result.data),
      inspect: {
        dsl: result.request,
        response: result.response,
      },
      isInspected: false,
    }),
    [result]
  );

  useEffect(() => {
    setQuery(buildVulnerableHostAggregationQuery({ from, to }));
  }, [setQuery, from, to]);

  const isLoading = isLoadingData && isSignalIndexLoading;

  return { isLoading, data: transformedResponse, refetch };
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
  rawAlertResponse: AlertSearchResponse<{}, AlertCountersBySeverityAggregation> | null
): AlertSeverityCounts[] {
  const buckets = rawAlertResponse?.aggregations?.[USERS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<AlertSeverityCounts[]>((accumalatedAlertsByUser, currentUser) => {
    return [
      ...accumalatedAlertsByUser,
      {
        userName: currentUser.key,
        count: currentUser.doc_count,
        low: currentUser.low.doc_count,
        medium: currentUser.medium.doc_count,
        high: currentUser.high.doc_count,
        critical: currentUser.critical.doc_count,
      },
    ];
  }, []);
}
