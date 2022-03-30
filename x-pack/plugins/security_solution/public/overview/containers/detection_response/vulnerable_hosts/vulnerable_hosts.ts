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

const ID = 'vulnerableHostsBySeverityQuery';
const HOST_BY_SEVERITY_AGG = 'hostsBySeverity';

interface UseStatusSeverityAlertCountersProps {
  from: string;
  to: string;
}

interface AlertSeverityCounts {
  hostName: string;
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

interface AlertCountersBySeverityAndSeverityAggregation {
  [HOST_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
}

interface AlertsCounterResult {
  counters: AlertSeverityCounts[];
  id: string;
  inspect: { dsl: string; response: string };
  isInspected: boolean;
}

interface UseStatusSeverityAlertCountersReturnType {
  isLoading: boolean;
  data: AlertsCounterResult;
  refetch: (() => Promise<void>) | null;
}

export const useVulnerableHostsCounters = ({
  from,
  to,
}: UseStatusSeverityAlertCountersProps): UseStatusSeverityAlertCountersReturnType => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const {
    setQuery,
    loading: isLoadingData,
    refetch,
    ...result
  } = useQueryAlerts<{}, AlertCountersBySeverityAndSeverityAggregation>({
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

export const buildVulnerableHostAggregationQuery = ({
  from,
  to,
}: UseStatusSeverityAlertCountersProps) => ({
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
    [HOST_BY_SEVERITY_AGG]: {
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
  rawAlertResponse: AlertSearchResponse<{}, AlertCountersBySeverityAndSeverityAggregation> | null
): AlertSeverityCounts[] {
  const buckets = rawAlertResponse?.aggregations?.[HOST_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<AlertSeverityCounts[]>((accumalatedAlertsByHost, currentHost) => {
    return [
      ...accumalatedAlertsByHost,
      {
        hostName: currentHost.key,
        count: currentHost.doc_count,
        low: currentHost.low.doc_count,
        medium: currentHost.medium.doc_count,
        high: currentHost.high.doc_count,
        critical: currentHost.critical.doc_count,
      },
    ];
  }, []);
}
