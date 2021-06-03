/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, SavedObjectsClientContract } from '../../../../../src/core/server';
import { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import { createMetricObjects } from '../routes/usage';
import { getBeatUsage, getLiveQueryUsage, getPolicyLevelUsage } from './fetchers';
import { CollectorDependencies, usageSchema } from './types';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collector = usageCollection.makeUsageCollector<any>({
    type: 'osquery',
    schema: usageSchema,
    isReady: async () => {
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(core);
      const savedObjectsClient = (internalSavedObjectsClient as unknown) as SavedObjectsClientContract;
      return await createMetricObjects(savedObjectsClient);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async ({ esClient }: CollectorFetchContext): Promise<any> => {
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(core);
      const savedObjectsClient = (internalSavedObjectsClient as unknown) as SavedObjectsClientContract;
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
