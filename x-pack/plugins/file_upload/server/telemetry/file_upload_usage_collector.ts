/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getTelemetry, initTelemetry, Telemetry } from './telemetry';

export function registerFileUploadUsageCollector(usageCollection: UsageCollectionSetup): void {
  const fileUploadUsageCollector = usageCollection.makeUsageCollector<Telemetry>({
    type: 'fileUploadTelemetry',
    isReady: () => true,
    fetch: async () => {
      const fileUploadUsage = await getTelemetry();
      if (!fileUploadUsage) {
        return initTelemetry();
      }

      return fileUploadUsage;
    },
    schema: {
      filesUploadedTotalCount: { type: 'long' },
    },
  });

  usageCollection.registerCollector(fileUploadUsageCollector);
}
