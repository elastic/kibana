/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectClient } from '../kibana_server_services';
import { MapStats, MapStatsCollector } from './map_stats';
import { findMaps } from './find_maps';

export type MapsUsage = MapStats;

export async function getMapsTelemetry(): Promise<MapsUsage> {
  const mapStatsCollector = new MapStatsCollector();
  await findMaps(getSavedObjectClient(), async (savedObject) => {
    mapStatsCollector.push(savedObject.attributes);
  });

  return {
    ...mapStatsCollector.getStats(),
  };
}
