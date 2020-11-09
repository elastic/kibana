/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, SavedObjectsClientContract } from '../../../../../src/core/server';
import { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import { CollectorDependencies } from './types';
import { DetectionsUsage, fetchDetectionsUsage, defaultDetectionsUsage } from './detections';
import { EndpointUsage, getEndpointTelemetryFromFleet } from './endpoints';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export interface UsageData {
  detections: DetectionsUsage;
  endpoints: EndpointUsage | {};
}

export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    return coreStart.savedObjects.createInternalRepository();
  });
}

export const registerCollector: RegisterCollector = ({
  core,
  kibanaIndex,
  ml,
  usageCollection,
}) => {
  if (!usageCollection) {
    return;
  }
  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema: {
      detections: {
        detection_rules: {
          custom: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
          elastic: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
        },
        ml_jobs: {
          custom: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
          elastic: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
        },
      },
      endpoints: {
        total_installed: { type: 'long' },
        active_within_last_24_hours: { type: 'long' },
        os: {
          type: 'array',
          items: {
            full_name: { type: 'keyword' },
            platform: { type: 'keyword' },
            version: { type: 'keyword' },
            count: { type: 'long' },
          },
        },
        policies: {
          malware: {
            active: { type: 'long' },
            inactive: { type: 'long' },
            failure: { type: 'long' },
          },
        },
      },
    },
    isReady: () => kibanaIndex.length > 0,
    fetch: async ({ callCluster }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = await getInternalSavedObjectsClient(core);
      const [detections, endpoints] = await Promise.allSettled([
        fetchDetectionsUsage(
          kibanaIndex,
          callCluster,
          ml,
          (savedObjectsClient as unknown) as SavedObjectsClientContract
        ),
        getEndpointTelemetryFromFleet(savedObjectsClient),
      ]);

      return {
        detections: detections.status === 'fulfilled' ? detections.value : defaultDetectionsUsage,
        endpoints: endpoints.status === 'fulfilled' ? endpoints.value : {},
      };
    },
  });

  usageCollection.registerCollector(collector);
};
