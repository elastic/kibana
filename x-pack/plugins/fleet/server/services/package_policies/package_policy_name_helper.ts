/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT, getMaxPackageName } from '../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../constants';

import { packagePolicyService } from '../package_policy';

export async function incrementPackageName(
  soClient: SavedObjectsClientContract,
  packageName: string
): Promise<string> {
  // Fetch all packagePolicies having the package name
  const packagePolicyData = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${packageName}"`,
  });

  return getMaxPackageName(packageName, packagePolicyData?.items);
}

export async function incrementPackagePolicyCopyName(
  soClient: SavedObjectsClientContract,
  packagePolicyName: string
): Promise<string> {
  let packageName = packagePolicyName;
  const packageNameMatches = packagePolicyName.match(/^(.*)\s\(copy\s?[0-9]*\)$/);
  if (packageNameMatches) {
    packageName = packageNameMatches[1];
  }

  // find all pacakge policies starting with the same name and increment the name
  const packagePolicyData = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: ${packageName}*`,
  });

  const maxVersion =
    packagePolicyData.items.length > 0
      ? Math.max(
          ...packagePolicyData.items.map((item) => {
            const matches = item.name.match(/^(.*)\s\(copy\s?([0-9]*)\)$/);
            if (matches) {
              return parseInt(matches[2], 10) || 1;
            }

            return 0;
          })
        )
      : 0;

  const copyVersion = maxVersion + 1;

  if (copyVersion === 1) {
    return `${packageName} (copy)`;
  }

  return `${packageName} (copy ${copyVersion})`;
}
