/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { CspBenchmarkRulesStates } from '../types/latest';

export const buildMutedRulesFilter = (
  rulesStates: CspBenchmarkRulesStates
): QueryDslQueryContainer[] => {
  const mutedRules = Object.fromEntries(
    Object.entries(rulesStates).filter(([key, value]) => value.muted === true)
  );

  const mutedRulesFilterQuery = Object.keys(mutedRules).map((key) => {
    const rule = mutedRules[key];
    return {
      bool: {
        must: [
          { term: { 'rule.benchmark.id': rule.benchmark_id } },
          { term: { 'rule.benchmark.version': rule.benchmark_version } },
          { term: { 'rule.benchmark.rule_number': rule.rule_number } },
        ],
      },
    };
  });

  return mutedRulesFilterQuery;
};

export const buildRuleKey = (benchmarkId: string, benchmarkVersion: string, ruleNumber: string) => {
  return `${benchmarkId};${benchmarkVersion};${ruleNumber}`;
};
