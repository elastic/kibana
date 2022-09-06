/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { hiddenTypes } from '../saved_objects';
import { filesSchema, FileKindUsageSchema } from './schema';
import { fetch } from './fetch';

interface Args {
  usageCollection?: UsageCollectionSetup;
  coreStartPromise: Promise<CoreStart>;
}

export function registerUsageCollector({ usageCollection, coreStartPromise }: Args): void {
  if (!usageCollection) {
    return;
  }

  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<FileKindUsageSchema>({
      type: 'files',
      fetch: async () => {
        return fetch({
          soClient: (await coreStartPromise).savedObjects.createInternalRepository(hiddenTypes),
        });
      },
      schema: filesSchema,
      isReady: () => coreStartPromise.then(() => true),
    })
  );
}
