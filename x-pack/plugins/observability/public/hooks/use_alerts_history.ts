/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import {
  ALERT_DURATION,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ValidFeatureId,
} from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { estypes } from '@elastic/elasticsearch';
import { ObservabilityAppServices } from '../application/types';

interface Props {
  featureIds: ValidFeatureId[];
  ruleId: string;
  dateRange: {
    from: string;
    to: string;
  };
}
interface FetchAlertsHistory {
  totalTriggeredAlerts: number;
  histogramTriggeredAlerts: estypes.AggregationsDateHistogramBucketKeys[];
  error?: string;
  avgTimeToRecoverUS: number;
}

export function useAlertsHistory({ featureIds, ruleId, dateRange }: Props) {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const abortCtrlRef = useRef(new AbortController());

  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchTriggeredAlertsHistory({
        featureIds,
        http,
        ruleId,
        dateRange,
        signal: abortCtrlRef.current.signal,
      });
    },
    [ruleId],
    { loading: true }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { value, error, loading } = state;
  return {
    ...value,
    error,
    loading,
    refetch,
  };
}

async function fetchTriggeredAlertsHistory({
  featureIds,
  http,
  ruleId,
  dateRange,
  signal,
}: {
  featureIds: ValidFeatureId[];
  http: HttpSetup;
  ruleId: string;
  dateRange: {
    from: string;
    to: string;
  };
  signal: AbortSignal;
}): Promise<FetchAlertsHistory> {
  return http
    .post<estypes.SearchResponse<Record<string, unknown>>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        size: 0,
        feature_ids: featureIds,
        query: {
          bool: {
            must: [
              {
                term: {
                  [ALERT_RULE_UUID]: ruleId,
                },
              },
              {
                range: {
                  [ALERT_TIME_RANGE]: dateRange,
                },
              },
            ],
          },
        },
        aggs: {
          histogramTriggeredAlerts: {
            date_histogram: {
              field: ALERT_START,
              fixed_interval: '1d',
              extended_bounds: {
                min: dateRange.from,
                max: dateRange.to,
              },
            },
          },
          avgTimeToRecoverUS: {
            filter: {
              term: {
                [ALERT_STATUS]: 'recovered',
              },
            },
            aggs: {
              recoveryTime: {
                avg: {
                  field: ALERT_DURATION,
                },
              },
            },
          },
        },
      }),
    })
    .then(extractAlertsHistory);
}

const extractAlertsHistory = (response: estypes.SearchResponse<Record<string, unknown>>) => {
  const totalTriggeredAlerts = (response.hits.total as estypes.SearchTotalHits).value || 0;

  const histogramAgg = response?.aggregations
    ?.histogramTriggeredAlerts as estypes.AggregationsMultiBucketAggregateBase;
  const histogramTriggeredAlerts =
    histogramAgg.buckets as unknown as estypes.AggregationsDateHistogramBucketKeys[];

  const avgTimeToRecoverAgg = response?.aggregations
    ?.avgTimeToRecoverUS as estypes.AggregationsAvgAggregate;
  const avgTimeToRecoverUS = avgTimeToRecoverAgg.value || 0;

  return {
    totalTriggeredAlerts,
    histogramTriggeredAlerts,
    avgTimeToRecoverUS,
  };
};
