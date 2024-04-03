/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@tanstack/react-query';
import { getRuleStatesKey } from '../configurations/latest_findings/use_get_benchmark_rules_state_api';
import { getCspmStatsKey, getKspmStatsKey } from '../../common/api';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  RuleStateAttributes,
} from '../../../common/types/latest';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

export type RuleStateAttributesWithoutStates = Omit<RuleStateAttributes, 'muted'>;
export const useChangeCspRuleState = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return async (actionOnRule: 'mute' | 'unmute', ruleIds: RuleStateAttributesWithoutStates[]) => {
    const query = {
      action: actionOnRule,
      rules: ruleIds,
    };

    const cspRuleBulkActionResponse = await http?.post<CspBenchmarkRulesBulkActionRequestSchema>(
      CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
      {
        version: '1',
        body: JSON.stringify(query),
      }
    );
    await queryClient.invalidateQueries(BENCHMARK_INTEGRATION_QUERY_KEY_V2); // causing rules counters refetch
    await queryClient.invalidateQueries(getCspmStatsKey); // causing cloud dashboard refetch
    await queryClient.invalidateQueries(getKspmStatsKey); // causing kubernetes dashboard refetch
    await queryClient.invalidateQueries(getRuleStatesKey); // the rule states are part of the findings query key, invalidating them will cause the latest findings to refetch only after the rules states were changed

    return cspRuleBulkActionResponse;
  };
};
