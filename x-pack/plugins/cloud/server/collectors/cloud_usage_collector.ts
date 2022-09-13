/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { type UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { type EssDeploymentMetadata } from '../ess_metadata_service';

interface Config {
  isCloudEnabled: boolean;
  deploymentMetadata$?: Observable<EssDeploymentMetadata>;
}

interface CloudUsage extends Partial<EssDeploymentMetadata> {
  isCloudEnabled: boolean;
  deploymentId?: string;
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, config: Config) {
  const { isCloudEnabled, deploymentMetadata$ } = config;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: { type: 'boolean' },
      deploymentId: {
        type: 'keyword',
        _meta: { description: 'The Cloud Deployment ID' },
      },
      organizationId: {
        type: 'keyword',
        _meta: { description: 'The Cloud Organization ID' },
      },
      isElasticStaffOrganization: {
        type: 'boolean',
        _meta: {
          description: '`true` if the deployment was created by an Elastician',
        },
      },
      inTrial: {
        type: 'boolean',
        _meta: {
          description: '`true` if the organization is in a trial period on Cloud',
        },
      },
    },
    fetch: async () => {
      const deploymentMetadata = deploymentMetadata$
        ? await firstValueFrom(deploymentMetadata$)
        : {};
      return {
        isCloudEnabled,
        ...deploymentMetadata,
      };
    },
  });
}

export function registerCloudUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  config: Config
) {
  if (!usageCollection) {
    return;
  }

  const collector = createCloudUsageCollector(usageCollection, config);
  usageCollection.registerCollector(collector);
}
