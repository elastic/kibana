/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
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
  histogramTriggeredAlerts: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
  }>;
  error?: string;
  avgTimeToRecoverUS: number;
}

interface AlertsHistory {
  isLoadingAlertsHistory: boolean;
  errorAlertHistory?: string;
  alertsHistory?: FetchAlertsHistory;
}
export function useAlertsHistory({ featureIds, ruleId, dateRange }: Props) {
  const { http } = useKibana().services;
  const [triggeredAlertsHistory, setTriggeredAlertsHistory] = useState<AlertsHistory>({
    isLoadingAlertsHistory: true,
  });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const loadRuleAlertsAgg = useCallback(async () => {
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      if (!http) throw new Error('No http client');
      if (!featureIds || !featureIds.length) throw new Error('No featureIds');

      const { totalTriggeredAlerts, histogramTriggeredAlerts, error, avgTimeToRecoverUS } =
        await fetchTriggeredAlertsHistory({
          featureIds,
          http,
          ruleId,
          signal: abortCtrlRef.current.signal,
          dateRange,
        });

      if (error) throw error;
      if (!isCancelledRef.current) {
        setTriggeredAlertsHistory((oldState: AlertsHistory) => ({
          ...oldState,
          alertsHistory: {
            totalTriggeredAlerts,
            histogramTriggeredAlerts,
            avgTimeToRecoverUS,
          },
          isLoadingAlertsHistory: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setTriggeredAlertsHistory((oldState: AlertsHistory) => ({
            ...oldState,
            isLoadingAlertsHistory: false,
            errorAlertHistory: error,
            alertsHistory: undefined,
          }));
        }
      }
    }
  }, [dateRange, featureIds, http, ruleId]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return triggeredAlertsHistory;
}

export async function fetchTriggeredAlertsHistory({
  featureIds,
  http,
  ruleId,
  signal,
  dateRange,
}: {
  featureIds: ValidFeatureId[];
  http: HttpSetup;
  ruleId: string;
  signal: AbortSignal;
  dateRange: {
    from: string;
    to: string;
  };
}): Promise<FetchAlertsHistory> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
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
    });
    const totalTriggeredAlerts = res?.hits.total.value;
    const histogramTriggeredAlerts = res?.aggregations?.histogramTriggeredAlerts.buckets;
    const avgTimeToRecoverUS = res?.aggregations?.avgTimeToRecoverUS.recoveryTime.value;

    return {
      totalTriggeredAlerts,
      histogramTriggeredAlerts,
      avgTimeToRecoverUS,
    };
  } catch (error) {
    return {
      error,
      totalTriggeredAlerts: 0,
      histogramTriggeredAlerts: [],
      avgTimeToRecoverUS: 0,
    };
  }
}
