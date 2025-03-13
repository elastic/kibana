/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HttpSetup } from '@kbn/core/public';
import { AggregationsDateHistogramBucketKeys } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ALERT_DURATION,
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { useQuery } from '@tanstack/react-query';

export interface Props {
  http: HttpSetup | undefined;
  ruleTypeIds: string[];
  consumers?: string[];
  ruleId: string;
  dateRange: {
    from: string;
    to: string;
  };
  instanceId?: string;
}

interface FetchAlertsHistory {
  totalTriggeredAlerts: number;
  histogramTriggeredAlerts: AggregationsDateHistogramBucketKeys[];
  avgTimeToRecoverUS: number;
}

export interface UseAlertsHistory {
  data: FetchAlertsHistory;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}
export const EMPTY_ALERTS_HISTORY = {
  totalTriggeredAlerts: 0,
  histogramTriggeredAlerts: [] as AggregationsDateHistogramBucketKeys[],
  avgTimeToRecoverUS: 0,
};

export function useAlertsHistory({
  ruleTypeIds,
  consumers,
  ruleId,
  dateRange,
  http,
  instanceId,
}: Props): UseAlertsHistory {
  const enabled = !!ruleTypeIds.length;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['useAlertsHistory'],
    queryFn: async ({ signal }) => {
      if (!http) {
        throw new Error('Http client is missing');
      }
      return fetchTriggeredAlertsHistory({
        ruleTypeIds,
        consumers,
        http,
        ruleId,
        dateRange,
        signal,
        instanceId,
      });
    },
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data: isInitialLoading ? EMPTY_ALERTS_HISTORY : data ?? EMPTY_ALERTS_HISTORY,
    isLoading: enabled && (isInitialLoading || isLoading || isRefetching),
    isSuccess,
    isError,
  };
}
interface AggsESResponse {
  aggregations: {
    avgTimeToRecoverUS: {
      doc_count: number;
      recoveryTime: {
        value: number;
      };
    };
    histogramTriggeredAlerts: {
      buckets: AggregationsDateHistogramBucketKeys[];
    };
  };
  hits: {
    total: {
      value: number;
    };
  };
}

export async function fetchTriggeredAlertsHistory({
  ruleTypeIds,
  consumers,
  http,
  ruleId,
  dateRange,
  signal,
  instanceId,
}: {
  ruleTypeIds: string[];
  consumers?: string[];
  http: HttpSetup;
  ruleId: string;
  dateRange: {
    from: string;
    to: string;
  };
  signal?: AbortSignal;
  instanceId?: string;
}): Promise<FetchAlertsHistory> {
  try {
    const responseES = await http.post<AggsESResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        size: 0,
        rule_type_ids: ruleTypeIds,
        consumers,
        query: {
          bool: {
            must: [
              {
                term: {
                  [ALERT_RULE_UUID]: ruleId,
                },
              },
              ...(instanceId && instanceId !== '*'
                ? [
                    {
                      term: {
                        [ALERT_INSTANCE_ID]: instanceId,
                      },
                    },
                  ]
                : []),
              {
                range: {
                  [ALERT_TIME_RANGE]: {
                    gte: dateRange.from,
                    lte: dateRange.to,
                  },
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
    });
    const totalTriggeredAlerts = responseES.hits.total.value;
    const avgTimeToRecoverUS = responseES.aggregations.avgTimeToRecoverUS.recoveryTime.value;
    const histogramTriggeredAlerts = responseES.aggregations.histogramTriggeredAlerts.buckets;
    return {
      totalTriggeredAlerts,
      histogramTriggeredAlerts,
      avgTimeToRecoverUS,
    };
  } catch (error) {
    throw new Error(
      "Something went wrong while fetching alert history chart's data. Error:",
      error
    );
  }
}
