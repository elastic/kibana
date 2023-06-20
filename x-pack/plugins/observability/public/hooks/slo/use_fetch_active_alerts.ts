/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

type SloId = string;

interface Params {
  sloIds: SloId[];
}

export interface ActiveAlerts {
  count: number;
  ruleIds: string[];
}

type ActiveAlertsMap = Record<SloId, ActiveAlerts>;

export interface UseFetchActiveAlerts {
  data: ActiveAlertsMap;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
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

export function useFetchActiveAlerts({ sloIds = [] }: Params): UseFetchActiveAlerts {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.activeAlert(sloIds),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.post<FindApiResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
          body: JSON.stringify({
            feature_ids: ['slo'],
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: 'now-5m/m',
                      },
                    },
                  },
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
          signal,
        });

        return response.aggregations.perSloId.buckets.reduce(
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
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
  });

  return {
    data: isInitialLoading ? EMPTY_ACTIVE_ALERTS_MAP : data ?? EMPTY_ACTIVE_ALERTS_MAP,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
