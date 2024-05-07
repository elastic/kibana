/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { RULE_STATE_QUERY_KEY } from './use_csp_rules_state';
import { CSPM_STATS_QUERY_KEY, KSPM_STATS_QUERY_KEY } from '../../common/api';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  RuleStateAttributes,
} from '../../../common/types/latest';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

export type RuleStateAttributesWithoutStates = Omit<RuleStateAttributes, 'muted'>;
export interface RuleStateUpdateRequest {
  newState: 'mute' | 'unmute';
  ruleIds: RuleStateAttributesWithoutStates[];
}

export const useChangeCspRuleState = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleStateUpdateRequest: RuleStateUpdateRequest) => {
      await http?.post<CspBenchmarkRulesBulkActionRequestSchema>(
        CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
        {
          version: '1',
          body: JSON.stringify({
            action: ruleStateUpdateRequest.newState,
            rules: ruleStateUpdateRequest.ruleIds,
          }),
        }
      );
    },
    onMutate: async (ruleStateUpdateRequest: RuleStateUpdateRequest) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(RULE_STATE_QUERY_KEY);

      // Snapshot the previous value
      const previousCspRules = queryClient.getQueryData(RULE_STATE_QUERY_KEY);

      // Optimistically update to the new value
      queryClient.setQueryData(['csp_rules_states_v1'], (currentRuleStates: any) => {
        const updateRuleStates: Record<string, RuleStateAttributes> = {};

        ruleStateUpdateRequest.ruleIds.forEach((ruleId) => {
          const matchingRuleKey = Object.keys(currentRuleStates).find(
            (key) => currentRuleStates[key].rule_id === ruleId.rule_id
          );
          if (matchingRuleKey) {
            const updatedRule = {
              ...currentRuleStates[matchingRuleKey],
              muted: ruleStateUpdateRequest.newState === 'mute',
            };

            updateRuleStates[matchingRuleKey] = updatedRule;
          }
        });
        return {
          ...currentRuleStates,
          ...updateRuleStates,
        };
      });

      // Return a context object with the previous value
      return { previousCspRules };
    },
    onSettled: () => {
      queryClient.invalidateQueries(BENCHMARK_INTEGRATION_QUERY_KEY_V2);
      queryClient.invalidateQueries(CSPM_STATS_QUERY_KEY);
      queryClient.invalidateQueries(KSPM_STATS_QUERY_KEY);
      queryClient.invalidateQueries(RULE_STATE_QUERY_KEY);
    },
  });
};
