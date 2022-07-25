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
import { AlertChartData } from '../sections/rule_details/components/alert_summary';

interface UseLoadRuleAlertsAggs {
  features: string;
  ruleId: string;
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
  alertsChartData: AlertChartData[];
}
interface IndexName {
  index: string;
}

export function useLoadRuleAlertsAggs({ features, ruleId }: UseLoadRuleAlertsAggs) {
  const { http } = useKibana().services;
  const [ruleAlertsAggs, setRuleAlertsAggs] = useState<LoadRuleAlertsAggs>({
    isLoadingRuleAlertsAggs: true,
    ruleAlertsAggs: { active: 0, recovered: 0 },
    alertsChartData: [],
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
      const { active, recovered, error, alertsChartData } = await fetchRuleAlertsAggByTimeRange({
        http,
        index,
        ruleId,
        signal: abortCtrlRef.current.signal,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
          ...oldState,
          ruleAlertsAggs: {
            active,
            recovered,
          },
          alertsChartData,
          isLoadingRuleAlertsAggs: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
            ...oldState,
            isLoadingRuleAlertsAggs: false,
            errorRuleAlertsAggs: 'error',
            alertsChartData: [],
          }));
        }
      }
    }
  }, [http, features, ruleId]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return ruleAlertsAggs;
}

export async function fetchIndexNameAPI({
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

interface RuleAlertsAggs {
  active: number;
  recovered: number;
  error?: string;
  alertsChartData: AlertChartData[];
}
interface BucketAggsPerDay {
  key_as_string: string;
  doc_count: number;
}

export async function fetchRuleAlertsAggByTimeRange({
  http,
  index,
  ruleId,
  signal,
}: {
  http: HttpSetup;
  index: string;
  ruleId: string;
  signal: AbortSignal;
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
                    // When needed, we can make this range configurable via a function argument.
                    gte: 'now-30d',
                    lt: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          filterAggs: {
            filters: {
              filters: {
                alert_active: { term: { 'kibana.alert.status': 'active' } },
                alert_recovered: { term: { 'kibana.alert.status': 'recovered' } },
              },
            },
            aggs: {
              status_per_day: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '1d',
                },
              },
            },
          },
        },
      }),
    });
    const active = res?.aggregations?.filterAggs.buckets.alert_active?.doc_count ?? 0;
    const recovered = res?.aggregations?.filterAggs.buckets.alert_recovered?.doc_count ?? 0;
    const alertsChartData = [
      ...res?.aggregations?.filterAggs.buckets.alert_active.status_per_day.buckets.map(
        (bucket: BucketAggsPerDay) => ({
          date: bucket.key_as_string,
          status: 'active',
          count: bucket.doc_count,
        })
      ),
      ...res?.aggregations?.filterAggs.buckets.alert_recovered.status_per_day.buckets.map(
        (bucket: BucketAggsPerDay) => ({
          date: bucket.key_as_string,
          status: 'recovered',
          count: bucket.doc_count,
        })
      ),
    ];

    return {
      active,
      recovered,
      alertsChartData,
    };
  } catch (error) {
    return {
      error,
      active: 0,
      recovered: 0,
      alertsChartData: [],
    } as RuleAlertsAggs;
  }
}
