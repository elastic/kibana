/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

import { useDataFetcher } from '../use_data_fetcher';

type SloId = string;

interface Params {
  sloIds: SloId[];
  sloAlertIndex?: string;
}

export interface ActiveAlerts {
  count: number;
  ruleIds: string[];
}

type ActiveAlertsMap = Record<SloId, ActiveAlerts>;

export interface UseFetchActiveAlerts {
  data: ActiveAlertsMap;
  loading: boolean;
  error: boolean;
}

interface FindApiResponse {
  aggregations: {
    perSloId: {
      buckets: Array<{
        key: string;
        doc_count: number;
        perRuleId: { buckets: Array<{ key: string; doc_count: number }> };
      }>;
    };
  };
}

const EMPTY_ACTIVE_ALERTS_MAP = {};

export function useFetchActiveAlerts({ sloIds = [] }: { sloIds: SloId[] }): UseFetchActiveAlerts {
  const params: Params = useMemo(() => ({ sloIds }), [sloIds]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: Params) => apiCallParams.sloIds.length > 0,
    []
  );

  const { data, loading, error } = useDataFetcher<Params, ActiveAlertsMap>({
    paramsForApiCall: params,
    initialDataState: EMPTY_ACTIVE_ALERTS_MAP,
    executeApiCall: fetchActiveAlerts,
    shouldExecuteApiCall,
  });

  return { data, loading, error };
}

const fetchActiveAlerts = async (
  params: Params,
  abortController: AbortController,
  http: HttpSetup
): Promise<ActiveAlertsMap> => {
  try {
    const response = await http.post<FindApiResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      body: JSON.stringify({
        feature_ids: ['slo'],
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
                },
              },
              {
                term: {
                  'kibana.alert.status': 'active',
                },
              },
            ],
          },
        },
        aggs: {
          perSloId: {
            terms: {
              field: 'kibana.alert.rule.parameters.sloId',
            },
            aggs: {
              perRuleId: {
                terms: {
                  field: 'kibana.alert.rule.uuid',
                },
              },
            },
          },
        },
      }),
      signal: abortController.signal,
    });

    const { aggregations } = response;
    return aggregations.perSloId.buckets.reduce(
      (acc, bucket) => ({
        ...acc,
        [bucket.key]: {
          count: bucket.doc_count ?? 0,
          ruleIds: bucket.perRuleId.buckets.map((rule) => rule.key),
        } as ActiveAlerts,
      }),
      {}
    );
  } catch (error) {
    // ignore error for retrieving slos
  }

  return EMPTY_ACTIVE_ALERTS_MAP;
};
