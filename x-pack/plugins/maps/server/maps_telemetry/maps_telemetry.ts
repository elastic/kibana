/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
import {
  getElasticsearch,
  getIndexPatternsServiceFactory,
  getSavedObjectClient,
} from '../kibana_server_services';
import { MapStats, MapStatsCollector } from './map_stats';
import { IndexPatternStats, IndexPatternStatsCollector } from './index_pattern_stats';
import { findMaps } from './find_maps';

export type MapsUsage = MapStats & IndexPatternStats;

async function getReadOnlyIndexPatternsService() {
  const factory = getIndexPatternsServiceFactory();
  return factory(
    new SavedObjectsClient(getSavedObjectClient()),
    getElasticsearch().client.asInternalUser
  );
}

export async function getMapsTelemetry(): Promise<MapsUsage> {
  const mapStatsCollector = new MapStatsCollector();
  const indexPatternService = await getReadOnlyIndexPatternsService();
  const indexPatternStatsCollector = new IndexPatternStatsCollector(indexPatternService);
  await findMaps(getSavedObjectClient(), async (savedObject) => {
    mapStatsCollector.push(savedObject.attributes);
    await indexPatternStatsCollector.push(savedObject);
  });

  return {
    ...(await indexPatternStatsCollector.getStats()),
    ...mapStatsCollector.getStats(),
  };
}
