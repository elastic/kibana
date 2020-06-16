/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ISavedObjectsRepository } from '../../../../../../src/core/server';
import { getEndpointTelemetryFromFleet, EndpointUsage } from './endpoint';

export interface UsageData {
  endpoint?: EndpointUsage;
}

export async function createSiemTelemetry(
  usageCollector: UsageCollectionSetup,
  savedObjectsClient: ISavedObjectsRepository
) {
  const collector = usageCollector.makeUsageCollector<UsageData>({
    type: 'security_solution',
    isReady: () => true,
    fetch: async () => {
      try {
        return {
          endpoint: await getEndpointTelemetryFromFleet(savedObjectsClient),
        };
      } catch (err) {
        return {};
      }
    },
    schema: {
      endpoint: {
        total_installed: { type: 'long' },
        active_within_last_24_hours: { type: 'long' },
        os: {
          full_name: { type: 'keyword' },
          platform: { type: 'keyword' },
          version: { type: 'keyword' },
          count: { type: 'long' },
        },
        policies: {
          malware: {
            success: { type: 'long' },
            warning: { type: 'long' },
            failure: { type: 'long' },
          },
        },
      },
    },
  });

  usageCollector.registerCollector(collector);
}
