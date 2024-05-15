/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  FLEET_ENDPOINT_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';

// set all endpoint policies serverless flag to true
// required so that endpoint will write heartbeats
export async function setEndpointPackagePolicyServerlessFlag(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicyService: PackagePolicyClient
): Promise<void> {
  const perPage: number = SO_SEARCH_LIMIT;
  let page: number = 1;
  let endpointPackagesResult: ListResult<PackagePolicy> | undefined;

  while (page === 1 || endpointPackagesResult?.total === perPage) {
    endpointPackagesResult = await getEndpointPackagePolicyBatch(
      soClient,
      packagePolicyService,
      page,
      perPage
    );
    await processBatch(endpointPackagesResult, soClient, esClient, packagePolicyService);
    page++;
  }
}

function getEndpointPackagePolicyBatch(
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  page: number,
  perPage: number
): Promise<ListResult<PackagePolicy>> {
  return packagePolicyService.list(soClient, {
    page,
    perPage,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`,
  });
}

async function processBatch(
  endpointPackagesResult: ListResult<PackagePolicy>,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packagePolicyService: PackagePolicyClient
): Promise<void> {
  if (!endpointPackagesResult.total) {
    return;
  }

  const updatedEndpointPackages = endpointPackagesResult.items
    .filter(
      (endpointPackage) =>
        !(
          endpointPackage?.inputs.every(
            (input) => input.config?.policy?.value?.meta?.serverless ?? false
          ) ?? false
        )
    )
    .map((endpointPackage) => ({
      ...endpointPackage,
      inputs: endpointPackage.inputs.map((input) => {
        const config = input?.config || {};
        const policy = config.policy || {};
        const policyValue = policy?.value || {};
        const meta = policyValue?.meta || {};
        return {
          ...input,
          config: {
            ...config,
            policy: {
              ...policy,
              value: {
                ...policyValue,
                meta: {
                  ...meta,
                  serverless: true,
                },
              },
            },
          },
        };
      }),
    }));

  if (updatedEndpointPackages.length === 0) {
    return;
  }

  await packagePolicyService.bulkUpdate(soClient, esClient, updatedEndpointPackages);
}
