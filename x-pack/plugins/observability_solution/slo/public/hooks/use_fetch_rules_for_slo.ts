/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule, AsApiContract } from '@kbn/triggers-actions-ui-plugin/public';
import { transformRule } from '@kbn/triggers-actions-ui-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { BurnRateRuleParams } from '../typings';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

interface Params {
  sloIds?: string[];
}

interface RuleApiResponse {
  page: number;
  total: number;
  per_page: number;
  data: Array<AsApiContract<Rule<BurnRateRuleParams>>>;
}

export function useFetchRulesForSlo({ sloIds = [] }: Params) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.rule(sloIds),
    queryFn: async () => {
      try {
        const body = JSON.stringify({
          filter: sloIds.map((sloId) => `alert.attributes.params.sloId:${sloId}`).join(' or '),
          per_page: 1000,
        });

        const response = await http.post<RuleApiResponse>(`/internal/alerting/rules/_find`, {
          body,
        });

        const rules = response.data.map((rule) => transformRule(rule)) as Array<
          Rule<BurnRateRuleParams>
        >;

        const init = sloIds.reduce((acc, sloId) => ({ ...acc, [sloId]: [] }), {});

        return rules.reduce(
          (acc, rule) => ({
            ...acc,
            [rule.params.sloId]: acc[rule.params.sloId].concat(rule),
          }),
          init as Record<string, Array<Rule<BurnRateRuleParams>>>
        );
      } catch (error) {
        // ignore error for retrieving slos
      }
    },
    enabled: Boolean(sloIds.length),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const refetchRules = refetch as () => void;

  return {
    data,
    isLoading,
    isSuccess,
    isError,
    refetchRules,
  };
}
