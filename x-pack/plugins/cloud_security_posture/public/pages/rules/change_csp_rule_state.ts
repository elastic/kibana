/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { getRuleStatesKey } from '../configurations/latest_findings/use_get_benchmark_rules_state_api';
import { getCspmStatsKey, getKspmStatsKey } from '../../common/api';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  RuleStateAttributes,
} from '../../../common/types/latest';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

export type RuleStateAttributesWithoutStates = Omit<RuleStateAttributes, 'muted'>;
interface UseChangeCspRuleStateOptions {
  actionOnRule: 'mute' | 'unmute';
  ruleIds: RuleStateAttributesWithoutStates[];
}

export const useChangeCspRuleState = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: UseChangeCspRuleStateOptions) => {
      const query = {
        action: options.actionOnRule,
        rules: options.ruleIds,
      };

      await http?.post<CspBenchmarkRulesBulkActionRequestSchema>(
        CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
        {
          version: '1',
          body: JSON.stringify(query),
        }
      );
    },
    onMutate: async (options: UseChangeCspRuleStateOptions) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(['csp_rules_states_v1']);

      // Snapshot the previous value
      const previousCspRules = queryClient.getQueryData(['csp_rules_states_v1']);

      // Optimistically update to the new value
      queryClient.setQueryData(['csp_rules_states_v1'], (old: any) => {
        const updateRules: Record<string, RuleStateAttributes> = {};
        options.ruleIds.forEach((ruleId) => {
          const oldRuleKey = Object.keys(old).find((key) => old[key].rule_id === ruleId.rule_id);
          if (oldRuleKey) {
            const updatedRule = {
              ...old[oldRuleKey],
              muted: options.actionOnRule === 'mute',
            };

            updateRules[oldRuleKey] = updatedRule;
          }
        });
        return {
          ...old,
          ...updateRules,
        };
      });

      // Return a context object with the previous value
      return { previousCspRules };
    },
    onSettled: () => {
      queryClient.invalidateQueries(BENCHMARK_INTEGRATION_QUERY_KEY_V2);
      queryClient.invalidateQueries(getCspmStatsKey);
      queryClient.invalidateQueries(getKspmStatsKey);
      queryClient.invalidateQueries(getRuleStatesKey);
    },
  });
};
