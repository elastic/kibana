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
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../benchmarks/benchmarks';
import { getBenchmarkFromPackagePolicy } from '../../../../common/utils/helpers';

import type { CspBenchmarkRule } from '../../../../common/types/latest';

export const getSortedCspBenchmarkRulesTemplates = (
  cspBenchmarkRules: CspBenchmarkRule[],
  sortDirection: 'asc' | 'desc'
) => {
  return cspBenchmarkRules.slice().sort((a, b) => {
    const ruleNumberA = a?.metadata?.benchmark?.rule_number;
    const ruleNumberB = b?.metadata?.benchmark?.rule_number;

    const versionA = semverValid(ruleNumberA);
    const versionB = semverValid(ruleNumberB);

    if (versionA !== null && versionB !== null) {
      return sortDirection === 'asc'
        ? semverCompare(versionA, versionB)
        : semverCompare(versionB, versionA);
    } else {
      return sortDirection === 'asc'
        ? String(ruleNumberA).localeCompare(String(ruleNumberB), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        : String(ruleNumberB).localeCompare(String(ruleNumberA), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
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
