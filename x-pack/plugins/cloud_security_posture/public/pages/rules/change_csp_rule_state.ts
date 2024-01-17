/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  RuleStateAttributes,
} from '../../../common/types/latest';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';

export type RuleStateAttributesWithoutStates = Omit<RuleStateAttributes, 'muted'>;
export const useChangeCspRuleState = () => {
  const { http } = useKibana().services;

  return async (actionOnRule: 'mute' | 'unmute', ruleIds: RuleStateAttributesWithoutStates[]) => {
    const query = {
      action: actionOnRule,
      rules: ruleIds,
    };
    return await http?.post<CspBenchmarkRulesBulkActionRequestSchema>(
      CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
      {
        version: '1',
        body: JSON.stringify(query),
      }
    );
  };
};
