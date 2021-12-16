/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { SavedObject } from 'kibana/server';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import {
  getElasticsearch,
  getIndexPatternsServiceFactory,
  getSavedObjectClient,
} from '../kibana_server_services';
import { SavedObjectsClient } from '../../../../../src/core/server';
import { MapStats, MapStatsCollector } from './map_stats';
import { IndexPatternStats, IndexPatternStatsCollector } from './index_pattern_stats';

export type MapsUsage = MapStats & IndexPatternStats;

async function findMaps(
  callback: (savedObject: SavedObject<MapSavedObjectAttributes>) => Promise<void>
) {
  const savedObjectsClient = getSavedObjectClient();

  let currentPage = 1;
  let page = 0;
  let perPage = 0;
  let total = 0;

  do {
    const results = await savedObjectsClient.find<MapSavedObjectAttributes>({
      type: MAP_SAVED_OBJECT_TYPE,
      page: currentPage++,
    });
    perPage = results.per_page;
    page = results.page;
    total = results.page;
    await asyncForEach(results.saved_objects, async (savedObject) => {
      await callback(savedObject);
    });
  } while (page * perPage < total);
}

async function getIndexPatternsService() {
  const factory = getIndexPatternsServiceFactory();
  return factory(
    new SavedObjectsClient(getSavedObjectClient()),
    getElasticsearch().client.asInternalUser
  );
}

export async function getMapsTelemetry(): Promise<MapsUsage> {
  const mapStatsCollector = new MapStatsCollector();
  const indexPatternService = await getIndexPatternsService();
  const indexPatternStatsCollector = new IndexPatternStatsCollector(indexPatternService);
  await findMaps(async (savedObject) => {
    mapStatsCollector.push(savedObject.attributes);
    await indexPatternStatsCollector.push(savedObject);
  });

  return {
    ...(await indexPatternStatsCollector.getStats()),
    ...mapStatsCollector.getStats(),
  };
}
