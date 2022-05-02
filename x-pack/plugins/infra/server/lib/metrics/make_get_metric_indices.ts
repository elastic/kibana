/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsServiceStart } from '@kbn/core/server';
import type { InfraSources } from '../sources';

export function makeGetMetricIndices(
  savedObjectsService: SavedObjectsServiceStart,
  metricSources: InfraSources
) {
  const getMetricIndices = async (request: KibanaRequest, sourceId: string = 'default') => {
    const savedObjectsClient = savedObjectsService.getScopedClient(request);
    const configuration = await metricSources.getSourceConfiguration(savedObjectsClient, sourceId);
    return configuration.configuration.metricAlias;
  };

  return getMetricIndices;
}
