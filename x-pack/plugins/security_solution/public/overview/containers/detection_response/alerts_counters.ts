/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { GenericBuckets } from '../../../../common/search_strategy';
import { inputsModel } from '../../../common/store';
import { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';

const ID = 'alertCountersByStatusAndSeverityQuery';
const ALERT_BY_STATUS_AGG = 'alertsByStatus';
const STATUS_BY_SEVERITY_AGG = 'statusBySeverity';

interface UseStatusSeverityAlertCountersProps {
  from: string;
  to: string;
}

interface AlertSeverityCount {
  count: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface AlertCountersStatusBySeverity {
  open: AlertSeverityCount;
  acknowledged: AlertSeverityCount;
  closed: AlertSeverityCount;
}

interface AlertByStatusBucketData extends GenericBuckets {
  [STATUS_BY_SEVERITY_AGG]: {
    buckets: GenericBuckets[];
  };
}

interface AlertCountersByStatusAndSeverityAggregation {
  [ALERT_BY_STATUS_AGG]: {
    buckets: AlertByStatusBucketData[];
  };
}

interface AlertsCounterResult {
  counters: Partial<AlertCountersStatusBySeverity>;
  id: string;
  inspect: { dsl: string; response: string };
  isInspected: boolean;
}

interface UseStatusSeverityAlertCountersReturnType {
  isLoading: boolean;
  data: AlertsCounterResult;
  refetch: (() => Promise<void>) | null;
}

export const useStatusSeverityAlertCounters = ({
  from,
  to,
}: UseStatusSeverityAlertCountersProps): UseStatusSeverityAlertCountersReturnType => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const {
    setQuery,
    loading: isLoadingData,
    refetch,
    ...result
  } = useQueryAlerts<{}, AlertCountersByStatusAndSeverityAggregation>({
    query: buildAlertAggregationQuery({ from, to }),
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
    setQuery(buildAlertAggregationQuery({ from, to }));
  }, [setQuery, from, to]);

  const isLoading = isLoadingData && isSignalIndexLoading;

  return { isLoading, data: transformedResponse, refetch };
};

const buildAlertAggregationQuery = ({ from, to }: UseStatusSeverityAlertTimeRange) => ({
  aggs: {
    [ALERT_BY_STATUS_AGG]: {
      terms: {
        field: 'kibana.alert.workflow_status',
      },
      aggs: {
        [STATUS_BY_SEVERITY_AGG]: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
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
});

type AlertStatus = 'open' | 'closed' | 'acknowledged';
function pickOffCounters(
  rawAlertResponse: AlertSearchResponse<{}, AlertCountersByStatusAndSeverityAggregation> | null
): Partial<AlertCountersStatusBySeverity> {
  const buckets = rawAlertResponse?.aggregations?.[ALERT_BY_STATUS_AGG].buckets ?? [];

  return buckets.reduce<Partial<AlertCountersStatusBySeverity>>(
    (accumalatedAlertsByStatus, currentStatus) => {
      return {
        ...accumalatedAlertsByStatus,
        [currentStatus.key]: {
          ...accumalatedAlertsByStatus[currentStatus.key as AlertStatus],
          count: currentStatus.doc_count,
          ...currentStatus[STATUS_BY_SEVERITY_AGG].buckets.reduce((acc, severity) => {
            return {
              ...acc,
              [severity.key]: severity.doc_count,
            };
          }, {}),
        },
      };
    },
    {}
  );
}
