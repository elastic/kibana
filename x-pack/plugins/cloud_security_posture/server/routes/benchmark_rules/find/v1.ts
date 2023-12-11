/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverValid from 'semver/functions/valid';
import semverCompare from 'semver/functions/compare';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getBenchmarkFilter } from '../../../../common/utils/helpers';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../benchmarks/benchmarks';
import { getBenchmarkFromPackagePolicy } from '../../../../common/utils/helpers';

import type {
  CspBenchmarkRule,
  FindCspBenchmarkRuleRequest,
  FindCspBenchmarkRuleResponse,
} from '../../../../common/types/latest';

export const getSortedCspBenchmarkRulesTemplates = (cspBenchmarkRules: CspBenchmarkRule[]) => {
  return cspBenchmarkRules.slice().sort((a, b) => {
    const ruleNumberA = a?.metadata?.benchmark?.rule_number;
    const ruleNumberB = b?.metadata?.benchmark?.rule_number;

    const versionA = semverValid(ruleNumberA);
    const versionB = semverValid(ruleNumberB);

    if (versionA !== null && versionB !== null) {
      return semverCompare(versionA, versionB);
    } else {
      return String(ruleNumberA).localeCompare(String(ruleNumberB));
    }
  });
};

export const getBenchmarkIdFromPackagePolicyId = async (
  soClient: SavedObjectsClientContract,
  packagePolicyId: string
): Promise<string> => {
  const res = await soClient.get<NewPackagePolicy>(
    PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    packagePolicyId
  );
  return getBenchmarkFromPackagePolicy(res.attributes.inputs);
};

export const findRuleHandler = async (
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
  const sortedCspBenchmarkRules = getSortedCspBenchmarkRulesTemplates(cspBenchmarkRules);

  return {
    items: sortedCspBenchmarkRules,
    total: cspCspBenchmarkRulesSo.total,
    page: options.page,
    perPage: options.perPage,
  };
};
