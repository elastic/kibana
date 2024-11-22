/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import type {
  FindCspBenchmarkRuleRequest,
  FindCspBenchmarkRuleResponse,
} from '@kbn/cloud-security-posture-common/schema/rules/v3';
import { getBenchmarkFilter } from '../../../../common/utils/helpers';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { getBenchmarkIdFromPackagePolicyId, getSortedCspBenchmarkRulesTemplates } from './utils';

export const findBenchmarkRuleHandler = async (
  soClient: SavedObjectsClientContract,
  options: FindCspBenchmarkRuleRequest
): Promise<FindCspBenchmarkRuleResponse> => {
  if (
    (!options.packagePolicyId && !options.benchmarkId) ||
    (options.packagePolicyId && options.benchmarkId)
  ) {
    throw new Error('Please provide either benchmarkId or packagePolicyId, but not both');
  }

  const benchmarkId = options.benchmarkId
    ? options.benchmarkId
    : await getBenchmarkIdFromPackagePolicyId(soClient, options.packagePolicyId!);

  const cspCspBenchmarkRulesSo = await soClient.find<CspBenchmarkRule>({
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    searchFields: options.searchFields,
    search: options.search ? `"${options.search}"*` : '',
    page: options.page,
    perPage: options.perPage,
    sortField: options.sortField,
    fields: options?.fields,
    filter: getBenchmarkFilter(benchmarkId, options.section),
  });

  const cspBenchmarkRules = cspCspBenchmarkRulesSo.saved_objects.map(
    (cspBenchmarkRule) => cspBenchmarkRule.attributes
  );

  // Semantic version sorting using semver for valid versions and custom comparison for invalid versions
  const sortedCspBenchmarkRules = getSortedCspBenchmarkRulesTemplates(cspBenchmarkRules, 'asc');

  return {
    items: sortedCspBenchmarkRules,
    total: cspCspBenchmarkRulesSo.total,
    page: options.page,
    perPage: options.perPage,
  };
};
