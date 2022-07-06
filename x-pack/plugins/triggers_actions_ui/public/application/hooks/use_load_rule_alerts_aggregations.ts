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

interface UseLoadRuleAlertsAggs {
  http: HttpSetup;
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
  ruleAlertsAggs: Omit<RuleAlertsAggs, 'error'>;
  errorRuleAlertsAggs?: string;
}

export function useLoadRuleAlertsAggs({ http, features, ruleId }: UseLoadRuleAlertsAggs) {
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
      const ruleAlertsAggByTimeRange = await fetchRuleAlertsAggByTimeRange({
        http,
        index,
        ruleId,
        signal: abortCtrlRef.current.signal,
      });
      if (ruleAlertsAggByTimeRange.error) throw ruleAlertsAggByTimeRange.error;
      if (!isCancelledRef.current) {
        setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
          ...oldState,
          ruleAlertsAggs: ruleAlertsAggByTimeRange,
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
                    gte: 'now-30d',
                    lt: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          alert_status: {
            terms: {
              field: 'kibana.alert.status',
              size: 2,
            },
          },
        },
      }),
    });

    const list = res?.aggregations?.alert_status_aggs?.buckets as Array<{
      key: string;
      doc_count: number;
    }>;
    return list.reduce(
      (acc, alertsStatus) => ({ ...acc, [alertsStatus.key]: alertsStatus.doc_count }),
      {}
    ) as RuleAlertsAggs;
  } catch (error) {
    return {
      error,
      active: 0,
      recovered: 0,
    } as RuleAlertsAggs;
  }
}
