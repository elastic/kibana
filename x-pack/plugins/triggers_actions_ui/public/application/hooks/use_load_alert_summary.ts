/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useKibana } from '../../common/lib/kibana';

export interface AlertSummaryTimeRange {
  utcFrom: string;
  utcTo: string;
  title: JSX.Element | string;
}

interface UseLoadAlertSummaryProps {
  features: string;
  timeRange: AlertSummaryTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}
interface AlertSummary {
  active: number;
  recovered: number;
  error?: string;
}

interface LoadAlertSummary {
  isLoading: boolean;
  alertSummary: {
    active: number;
    recovered: number;
  };
  error?: string;
}

interface IndexName {
  index: string;
}

export function useLoadAlertSummary({ features, timeRange, filter }: UseLoadAlertSummaryProps) {
  const { http } = useKibana().services;
  const [alertSummary, setAlertSummary] = useState<LoadAlertSummary>({
    isLoading: true,
    alertSummary: { active: 0, recovered: 0 },
  });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const loadRuleAlertsAgg = useCallback(async () => {
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();
    try {
      if (!features) return;
      const { index } = await fetchIndexNameAPI({
        http,
        features,
      });
      const { active, recovered, error } = await fetchRuleAlertsAggByTimeRange({
        http,
        index,
        signal: abortCtrlRef.current.signal,
        timeRange,
        filter,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setAlertSummary((oldState: LoadAlertSummary) => ({
          ...oldState,
          alertSummary: {
            active,
            recovered,
          },
          isLoading: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setAlertSummary((oldState: LoadAlertSummary) => ({
            ...oldState,
            isLoading: false,
            error,
          }));
        }
      }
    }
  }, [features, filter, http, timeRange]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return alertSummary;
}

async function fetchIndexNameAPI({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<IndexName> {
  const res = await http.get<{ index_name: string[] }>(`${BASE_RAC_ALERTS_API_PATH}/index`, {
    query: { features },
  });
  return {
    index: res.index_name[0],
  };
}

async function fetchRuleAlertsAggByTimeRange({
  http,
  index,
  signal,
  timeRange: { utcFrom, utcTo },
  filter,
}: {
  http: HttpSetup;
  index: string;
  signal: AbortSignal;
  timeRange: AlertSummaryTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}): Promise<AlertSummary> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        index,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: utcFrom,
                    lt: utcTo,
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      term: {
                        'kibana.alert.status': 'active',
                      },
                    },
                    {
                      term: {
                        'kibana.alert.status': 'recovered',
                      },
                    },
                  ],
                },
              },
              ...(filter ? [filter] : []),
            ],
          },
        },
        aggs: {
          total: {
            filters: {
              filters: {
                totalActiveAlerts: {
                  term: {
                    'kibana.alert.status': 'active',
                  },
                },
                totalRecoveredAlerts: {
                  term: {
                    'kibana.alert.status': 'recovered',
                  },
                },
              },
            },
          },
        },
      }),
    });

    const active = res?.aggregations?.total.buckets.totalActiveAlerts?.doc_count ?? 0;
    const recovered = res?.aggregations?.total.buckets.totalRecoveredAlerts?.doc_count ?? 0;

    return {
      active,
      recovered,
    };
  } catch (error) {
    return {
      error,
      active: 0,
      recovered: 0,
    };
  }
}
