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
import { InspectResponse } from '../../../types';

const ID = 'alertCountersByStatusAndSeverityQuery';
const ALERT_BY_STATUS_AGG = 'alertsByStatus';
const STATUS_BY_SEVERITY_AGG = 'statusBySeverity';

interface UseStatusSeverityAlertTimeRange {
  from: string;
  to: string;
}

interface UseStatusSeverityAlertCountersProps extends UseStatusSeverityAlertTimeRange {
  indexName: string | null;
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

export interface AlertsCounterResult {
  counters: AlertCountersStatusBySeverity;
  id: string;
  inspect: { dsl: string; response: string };
  isInspected: boolean;
  //   refetch: inputsModel.Refetch; what is this used for
}

export const useStatusSeverityAlertCounters = ({
  from,
  to,
  indexName,
}: UseStatusSeverityAlertCountersProps): [boolean, AlertsCounterResult] => {
  const { setQuery, loading, ...result } = useQueryAlerts<
    {},
    AlertCountersByStatusAndSeverityAggregation
  >({
    query: buildAlertAggregationQuery({ from, to }),
    indexName,
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

  return [loading, transformedResponse];
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

type AlertStatus = 'open' | 'closed' | 'acknowledged'; // can import from somewhere?
function pickOffCounters(
  rawAlertResponse: AlertSearchResponse<{}, AlertCountersByStatusAndSeverityAggregation> | null
): AlertCountersStatusBySeverity {
  if (!rawAlertResponse?.aggregations) {
    return defaultCounters;
  } else {
    return rawAlertResponse.aggregations[ALERT_BY_STATUS_AGG].buckets.reduce(
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
      defaultCounters
    );
  }
}

const defaultShape = {
  count: 0,
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
};

const defaultCounters = {
  open: defaultShape,
  acknowledged: defaultShape,
  closed: defaultShape,
};
