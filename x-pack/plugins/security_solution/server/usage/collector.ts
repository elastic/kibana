/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from '../../../../../src/core/server';
import { CollectorDependencies } from './types';
import { DetectionsUsage, fetchDetectionsUsage } from './detections';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export interface UsageData {
  detections: DetectionsUsage;
}

export const registerCollector: RegisterCollector = ({ kibanaIndex, ml, usageCollection }) => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema: {
      detections: {
        detection_rules_custom_enabled: { type: 'number' },
        detection_rules_custom_disabled: { type: 'number' },
        detection_rules_elastic_enabled: { type: 'number' },
        detection_rules_elastic_disabled: { type: 'number' },
        ml_jobs_custom_enabled: { type: 'number' },
        ml_jobs_custom_disabled: { type: 'number' },
        ml_jobs_elastic_enabled: { type: 'number' },
        ml_jobs_elastic_disabled: { type: 'number' },
      },
    },
    isReady: () => kibanaIndex.length > 0,
    fetch: async (callCluster: LegacyAPICaller): Promise<UsageData> => ({
      detections: await fetchDetectionsUsage(kibanaIndex, callCluster, ml),
    }),
  });

  usageCollection.registerCollector(collector);
};
