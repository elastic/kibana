/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import {
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface UseFetchTriggeredAlertsHistoryProps {
  features: string;
  ruleId: string;
}
interface FetchTriggeredAlertsHistory {
  totalTriggeredAlerts: number;
  histogramTriggeredAlerts: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
  }>;
  error?: string;
  avgTimeToRecoverMS: number;
}

interface TriggeredAlertsHistory {
  isLoadingTriggeredAlertHistory: boolean;
  errorTriggeredAlertHistory?: string;
  triggeredAlertsData?: FetchTriggeredAlertsHistory;
}
export function useFetchTriggeredAlertsHistory({
  features,
  ruleId,
}: UseFetchTriggeredAlertsHistoryProps) {
  const { http } = useKibana().services;
  const [triggeredAlertsHistory, setTriggeredAlertsHistory] =
    useState<TriggeredAlertsHistory>({
      isLoadingTriggeredAlertHistory: true,
    });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const loadRuleAlertsAgg = useCallback(async () => {
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      if (!http) throw new Error('No http client');
      if (!features) return;
      const { index } = await fetchIndexNameAPI({
        http,
        features,
      });

      const {
        totalTriggeredAlerts,
        histogramTriggeredAlerts,
        error,
        avgTimeToRecoverMS,
      } = await fetchTriggeredAlertsHistory({
        http,
        index,
        ruleId,
        signal: abortCtrlRef.current.signal,
      });

      if (error) throw error;
      if (!isCancelledRef.current) {
        setTriggeredAlertsHistory((oldState: TriggeredAlertsHistory) => ({
          ...oldState,
          triggeredAlertsData: {
            totalTriggeredAlerts,
            histogramTriggeredAlerts,
            avgTimeToRecoverMS,
          },
          isLoadingRuleAlertsAggs: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setTriggeredAlertsHistory((oldState: TriggeredAlertsHistory) => ({
            ...oldState,
            isLoadingRuleAlertsAggs: false,
            errorTriggeredAlertHistory: error,
            triggeredAlertsData: undefined,
          }));
        }
      }
    }
  }, [features, http, ruleId]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return triggeredAlertsHistory;
}

interface IndexName {
  index: string;
}

export async function fetchIndexNameAPI({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<IndexName> {
  const res = await http.get<{ index_name: string[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/index`,
    {
      query: { features },
    }
  );
  return {
    index: res.index_name[0],
  };
}

export async function fetchTriggeredAlertsHistory({
  http,
  index,
  ruleId,
  signal,
}: {
  http: HttpSetup;
  index: string;
  ruleId: string;
  signal: AbortSignal;
}): Promise<FetchTriggeredAlertsHistory> {
  try {
    const res = await http.post<AsApiContract<any>>(
      `${BASE_RAC_ALERTS_API_PATH}/find`,
      {
        signal,
        body: JSON.stringify({
          index,
          size: 0,
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
                    [ALERT_TIME_RANGE]: {
                      gte: 'now-30d',
                      lt: 'now',
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
                  min: 'now-30d',
                  max: 'now',
                },
              },
            },
            avgTimeToRecoverMS: {
              avg: {
                script: {
                  source:
                    "if (!doc['kibana.alert.end'].empty){return(doc['kibana.alert.end'].value.millis) - (doc['kibana.alert.start'].value.millis)}",
                },
              },
            },
          },
        }),
      }
    );
    const totalTriggeredAlerts = res?.hits.total.value;
    const histogramTriggeredAlerts =
      res?.aggregations?.histogramTriggeredAlerts.buckets;
    const avgTimeToRecoverMS = res?.aggregations?.avgTimeToRecoverMS.value;
    return {
      totalTriggeredAlerts,
      histogramTriggeredAlerts,
      avgTimeToRecoverMS,
    };
  } catch (error) {
    console.error(error);
    return {
      error,
      totalTriggeredAlerts: 0,
      histogramTriggeredAlerts: [],
      avgTimeToRecoverMS: 0,
    };
  }
}
