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
import { RULE_LOAD_ERROR } from '../pages/rule_details/translations';

interface UseFetchLast24hAlertsProps {
  http: HttpSetup;
  features: string;
  ruleId: string;
}
interface FetchLast24hAlerts {
  isLoadingLast24hAlerts: boolean;
  last24hAlerts: number;
  errorLast24hAlerts: string | undefined;
}

export function useFetchLast24hAlerts({ http, features, ruleId }: UseFetchLast24hAlertsProps) {
  const [last24hAlerts, setLast24hAlerts] = useState<FetchLast24hAlerts>({
    isLoadingLast24hAlerts: true,
    last24hAlerts: 0,
    errorLast24hAlerts: undefined,
  });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const fetchLast24hAlerts = useCallback(async () => {
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();
    try {
      if (!features) return;
      const { index } = await fetchIndexNameAPI({
        http,
        features,
      });
      const { error, alertsCount } = await fetchLast24hAlertsAPI({
        http,
        index,
        ruleId,
        signal: abortCtrlRef.current.signal,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setLast24hAlerts((oldState: FetchLast24hAlerts) => ({
          ...oldState,
          last24hAlerts: alertsCount,
          isLoadingLast24hAlerts: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setLast24hAlerts((oldState: FetchLast24hAlerts) => ({
            ...oldState,
            isLoadingLast24hAlerts: false,
            errorLast24hAlerts: RULE_LOAD_ERROR(
              error instanceof Error ? error.message : typeof error === 'string' ? error : ''
            ),
          }));
        }
      }
    }
  }, [http, features, ruleId]);
  useEffect(() => {
    fetchLast24hAlerts();
  }, [fetchLast24hAlerts]);

  return last24hAlerts;
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
export async function fetchLast24hAlertsAPI({
  http,
  index,
  ruleId,
  signal,
}: {
  http: HttpSetup;
  index: string;
  ruleId: string;
  signal: AbortSignal;
}): Promise<{
  error: string | null;
  alertsCount: number;
}> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        index,
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
                    gte: 'now-24h',
                    lt: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: 'kibana.alert.uuid',
            },
          },
        },
      }),
    });
    return {
      error: null,
      alertsCount: res.aggregations.alerts_count.value,
    };
  } catch (error) {
    return {
      error,
      alertsCount: 0,
    };
  }
}
