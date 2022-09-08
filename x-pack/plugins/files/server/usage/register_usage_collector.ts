/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FileServiceStart } from '../file_service';
import { filesSchema, FileKindUsageSchema } from './schema';
interface Args {
  usageCollection?: UsageCollectionSetup;
  getFileService: () => undefined | FileServiceStart;
}

export function registerUsageCollector({ usageCollection, getFileService }: Args): void {
  if (!usageCollection) {
    return;
  }

  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<FileKindUsageSchema>({
      type: 'files',
      isReady: () => Boolean(getFileService()),
      fetch: async () => {
        const { countByExtension, ...rest } = await getFileService()!.getUsageMetrics();
        return {
          ...rest,
          countByExtension: Object.entries(countByExtension).map(([extension, count]) => ({
            extension,
            count,
          })),
        };
      },
      schema: filesSchema,
    })
  );
}
