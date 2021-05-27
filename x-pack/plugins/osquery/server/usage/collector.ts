/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '../../../../../src/core/server';
import { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import { getBeatUsage, getLiveQueryUsage } from './fetchers';
import { CollectorDependencies, usageSchema } from './types';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    return coreStart.savedObjects.createInternalRepository();
  });
}

export const registerCollector: RegisterCollector = ({ usageCollection }) => {
  if (!usageCollection) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collector = usageCollection.makeUsageCollector<any>({
    type: 'osquery',
    schema: usageSchema,
    isReady: () => true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async ({ esClient }: CollectorFetchContext): Promise<any> => {
      return {
        beat_metrics: {
          usage: await getBeatUsage(esClient),
        },
        live_query_usage: getLiveQueryUsage(),
      };
    },
  });

  usageCollection.registerCollector(collector);
};
