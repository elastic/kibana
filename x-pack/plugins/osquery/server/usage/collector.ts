/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, SavedObjectsClient } from '../../../../../src/core/server';
import { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import { createMetricObjects } from '../routes/usage';
import { getBeatUsage, getLiveQueryUsage, getPolicyLevelUsage } from './fetchers';
import { CollectorDependencies, usageSchema, UsageData } from './types';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    return coreStart.savedObjects.createInternalRepository();
  });
}

export const registerCollector: RegisterCollector = ({ core, osqueryContext, usageCollection }) => {
  if (!usageCollection) {
    return;
  }
  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'osquery',
    schema: usageSchema,
    isReady: async () => {
      const savedObjectsClient = new SavedObjectsClient(await getInternalSavedObjectsClient(core));
      return await createMetricObjects(savedObjectsClient);
    },
    fetch: async ({ esClient }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = new SavedObjectsClient(await getInternalSavedObjectsClient(core));
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
