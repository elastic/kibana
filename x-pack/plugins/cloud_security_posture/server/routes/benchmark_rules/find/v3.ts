/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getBenchmarkFilterQueryV2 } from '../../../../common/utils/helpers';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../../../common/constants';

import type {
  CspBenchmarkRule,
  FindCspBenchmarkRuleRequest,
  FindCspBenchmarkRuleResponse,
} from '../../../../common/types/latest';
import { getSortedCspBenchmarkRulesTemplates } from './utils';

export const findBenchmarkRuleHandler = async (
  soClient: SavedObjectsClientContract,
  options: FindCspBenchmarkRuleRequest
): Promise<FindCspBenchmarkRuleResponse> => {
  if (!options.benchmarkId) {
    throw new Error('Please provide benchmarkId');
  }
  const sectionFilter: string[] | undefined =
    typeof options?.section === 'string' ? [options?.section] : options?.section;
  const ruleNumberFilter: string[] | undefined =
    typeof options?.ruleNumber === 'string' ? [options?.ruleNumber] : options?.ruleNumber;
  const benchmarkId = options.benchmarkId;
  const cspCspBenchmarkRulesSo = await soClient.find<CspBenchmarkRule>({
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    searchFields: options.searchFields,
    search: options.search ? `"${options.search}"*` : '',
    page: options.page,
    perPage: options.perPage,
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    fields: options?.fields,
    filter: getBenchmarkFilterQueryV2(benchmarkId, options.benchmarkVersion || '', {
      section: sectionFilter,
      ruleNumber: ruleNumberFilter,
    }),
  });

  const cspBenchmarkRules = cspCspBenchmarkRulesSo.saved_objects.map(
    (cspBenchmarkRule) => cspBenchmarkRule.attributes
  );

  // Semantic version sorting using semver for valid versions and custom comparison for invalid versions
  const sortedCspBenchmarkRules = getSortedCspBenchmarkRulesTemplates(
    cspBenchmarkRules,
    options.sortOrder
  );

  return {
    items:
      options.sortField === 'metadata.benchmark.rule_number'
        ? sortedCspBenchmarkRules
        : cspBenchmarkRules,
    total: cspCspBenchmarkRulesSo.total,
    page: options.page,
    perPage: options.perPage,
  };
};
