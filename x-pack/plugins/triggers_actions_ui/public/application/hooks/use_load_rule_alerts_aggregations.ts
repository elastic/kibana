/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useKibana } from '../../common/lib/kibana';

export interface AlertSummaryTimeRange {
  utcFrom: string;
  utcTo: string;
  title: JSX.Element | string;
}

interface UseLoadRuleAlertsAggs {
  features: string;
  ruleId: string;
  timeRange: AlertSummaryTimeRange;
}
interface RuleAlertsAggs {
  active: number;
  recovered: number;
  error?: string;
}

interface LoadRuleAlertsAggs {
  isLoadingRuleAlertsAggs: boolean;
  ruleAlertsAggs: {
    active: number;
    recovered: number;
  };
  errorRuleAlertsAggs?: string;
}

interface IndexName {
  index: string;
}

export function useLoadRuleAlertsAggs({ features, ruleId, timeRange }: UseLoadRuleAlertsAggs) {
  const { http } = useKibana().services;
  const [ruleAlertsAggs, setRuleAlertsAggs] = useState<LoadRuleAlertsAggs>({
    isLoadingRuleAlertsAggs: true,
    ruleAlertsAggs: { active: 0, recovered: 0 },
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
        ruleId,
        signal: abortCtrlRef.current.signal,
        timeRange,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
          ...oldState,
          ruleAlertsAggs: {
            active,
            recovered,
          },
          isLoadingRuleAlertsAggs: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
            ...oldState,
            isLoadingRuleAlertsAggs: false,
            errorRuleAlertsAggs: error,
          }));
        }
      }
    }
  }, [features, http, ruleId, timeRange]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return ruleAlertsAggs;
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
  ruleId,
  signal,
  timeRange: { utcFrom, utcTo },
}: {
  http: HttpSetup;
  index: string;
  ruleId: string;
  signal: AbortSignal;
  timeRange: AlertSummaryTimeRange;
}): Promise<RuleAlertsAggs> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        index,
        size: 0,
        query: {
          bool: {
            must: [
              {
                term: {
                  'kibana.alert.rule.uuid': ruleId,
                },
              },
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
    } as RuleAlertsAggs;
  }
}
