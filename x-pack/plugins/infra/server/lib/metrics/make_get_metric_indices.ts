/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IInfraSources } from '../sources';

export function makeGetMetricIndices(metricSources: IInfraSources) {
  return async (savedObjectsClient: SavedObjectsClientContract, sourceId: string = 'default') => {
    const source = await metricSources.getSourceConfiguration(savedObjectsClient, sourceId);
    return source.configuration.metricAlias;
  };
}
