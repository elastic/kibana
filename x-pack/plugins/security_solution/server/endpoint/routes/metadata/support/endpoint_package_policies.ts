/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { PackagePolicy } from '@kbn/fleet-plugin/common/types/models';

export const getAllEndpointPackagePolicies = async (
  packagePolicyService: PackagePolicyServiceInterface,
  soClient: SavedObjectsClientContract
): Promise<PackagePolicy[]> => {
  const result: PackagePolicy[] = [];
  const perPage = 1000;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const endpointPoliciesResponse = await packagePolicyService.list(soClient, {
      perPage,
      page: page++,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
    if (endpointPoliciesResponse.items.length > 0) {
      result.push(...endpointPoliciesResponse.items);
    } else {
      hasMore = false;
    }
  }

  return result;
};
