/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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

interface UseLoadRuleAlertsAggs {
  features: string;
  ruleId: string;
}
interface RuleAlertsAggs {
  active: number;
  recovered: number;
  error?: string;
}
export interface AlertChartData {
  active: number;
  recovered: number;
  date?: string;
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
    alertsChartData: [] as AlertChartData[],
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
            active: active || 0,
            recovered: recovered || 0,
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
            alertsChartData: [] as AlertChartData[],
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
          alert_status_aggs_total: {
            terms: {
              field: 'kibana.alert.status',
              size: 2,
            },
          },
          alert_status_aggs: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1d',
            },
            aggs: {
              alert_status_aggs_per_day: {
                terms: {
                  field: 'kibana.alert.status',
                  size: 2,
                },
              },
            },
          },
        },
      }),
    });

    const list = res?.aggregations?.alert_status_aggs_total?.buckets as Array<{
      key: string;
      doc_count: number;
    }>;
    const dataHistogram = res?.aggregations?.alert_status_aggs?.buckets as Array<{
      alert_status_aggs_per_day: {
        buckets: Array<{
          key: string;
          doc_count: number;
        }>;
      };
      key_as_string: string;
      doc_count: number;
    }>;

    const alertsChartData = dataHistogram.map((day) => ({
      date: day.key_as_string,
      ...day.alert_status_aggs_per_day.buckets.reduce(
        (acc, alertsStatus) => ({ ...acc, [alertsStatus.key]: alertsStatus.doc_count }),
        {
          active: 0,
          recovered: 0,
        }
      ),
    })) as AlertChartData[];
    const ruleAlertsAgg = list.reduce(
      (acc, alertsStatus) => ({ ...acc, [alertsStatus.key]: alertsStatus.doc_count }),
      {}
    ) as RuleAlertsAggs;

    return {
      ...ruleAlertsAgg,
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
