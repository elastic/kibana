/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from '../../../../../src/core/server';
import { CollectorOptions } from '../../../../../src/plugins/usage_collection/server';
import { SERVER_APP_ID } from '../../common/constants';
import { CollectorDependencies } from './types';
import { DetectionsUsage, getDetectionsSchema, fetchDetectionsUsage } from './detections';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export interface UsageData {
  detections: DetectionsUsage;
}

export const registerCollector: RegisterCollector = ({ kibanaIndex, ml, usageCollection }) => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>(
    buildCollectorOptions(kibanaIndex, ml)
  );

  usageCollection.registerCollector(collector);
};

export const buildCollectorOptions = (
  kibanaIndex: string,
  ml: CollectorDependencies['ml']
): CollectorOptions<UsageData> => ({
  type: SERVER_APP_ID,
  schema: {
    detections: getDetectionsSchema(),
  },
  isReady: () => kibanaIndex.length > 0,
  fetch: async (callCluster: LegacyAPICaller) => {
    return {
      detections: await fetchDetectionsUsage(kibanaIndex, callCluster, ml),
    };
  },
});
