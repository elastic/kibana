/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { getBeatUsage, getLiveQueryUsage, getPolicyLevelUsage } from './fetchers';
import type { CollectorDependencies, UsageData } from './types';
import { usageSchema } from './types';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export const getInternalSavedObjectsClient = async (
  getStartServices: CoreSetup['getStartServices']
) => {
  const [coreStart] = await getStartServices();

  return new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
};

export const registerCollector: RegisterCollector = ({ core, osqueryContext, usageCollection }) => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'osquery',
    schema: usageSchema,
    isReady: () => true,
    fetch: async ({ esClient }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = await getInternalSavedObjectsClient(core.getStartServices);

      return {
        beat_metrics: {
          usage: await getBeatUsage(esClient),
        },
        live_query_usage: await getLiveQueryUsage(savedObjectsClient, esClient),
        ...(await getPolicyLevelUsage(
          esClient,
          savedObjectsClient,
          osqueryContext.service.getPackagePolicyService()
        )),
      };
    },
  });

  usageCollection.registerCollector(collector);
};
