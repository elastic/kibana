/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import type { CollectorDependencies } from './types';
import { getDetectionsMetrics } from './detections/get_metrics';
import { schema, UsageData } from './schema';
import { getInternalSavedObjectsClient } from './get_internal_saved_objects_client';

export type RegisterCollector = (deps: CollectorDependencies) => void;

export const registerCollector: RegisterCollector = ({
  core,
  kibanaIndex,
  signalsIndex,
  ml,
  usageCollection,
  logger,
}) => {
  if (!usageCollection) {
    logger.debug('Usage collection is undefined, therefore returning early without registering it');
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema,
    isReady: () => true,
    fetch: async ({ esClient }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = await getInternalSavedObjectsClient(core);
      const detectionMetrics = await getDetectionsMetrics({
        kibanaIndex,
        signalsIndex,
        esClient,
        savedObjectsClient,
        logger,
        mlClient: ml,
      });
      return {
        detectionMetrics: detectionMetrics || {},
      };
    },
  });

  usageCollection.registerCollector(collector);
};
