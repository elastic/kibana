/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import { LayerStatsCollector } from './layer_stats_collector';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

const expecteds = [
  {
    layerCount: 4,
    basemapCounts: { roadmap: 1 },
    joinCounts: {},
    layerCounts: { ems_basemap: 1, ems_region: 1, es_agg_clusters: 1, layer_group: 1 },
    resolutionCounts: { coarse: 1 },
    scalingCounts: {},
    emsFileCounts: { italy_provinces: 1 },
    layerTypeCounts: { GEOJSON_VECTOR: 2, LAYER_GROUP: 1, TILE: 1 },
    sourceCount: 3,
  },
  {
    layerCount: 3,
    basemapCounts: { roadmap: 1 },
    joinCounts: { term: 1 },
    layerCounts: { ems_basemap: 1, ems_region: 1, es_docs: 1 },
    resolutionCounts: {},
    scalingCounts: { limit: 1 },
    emsFileCounts: { france_departments: 1 },
    layerTypeCounts: { TILE: 1, GEOJSON_VECTOR: 2 },
    sourceCount: 3,
  },
  {
    layerCount: 2,
    basemapCounts: { roadmap: 1 },
    joinCounts: {},
    layerCounts: { ems_basemap: 1, ems_region: 1 },
    resolutionCounts: {},
    scalingCounts: {},
    emsFileCounts: { canada_provinces: 1 },
    layerTypeCounts: { TILE: 1, GEOJSON_VECTOR: 1 },
    sourceCount: 2,
  },
  {
    layerCount: 1,
    basemapCounts: {},
    joinCounts: {},
    layerCounts: { es_agg_clusters: 1 },
    resolutionCounts: { coarse: 1 },
    scalingCounts: {},
    emsFileCounts: {},
    layerTypeCounts: { GEOJSON_VECTOR: 1 },
    sourceCount: 1,
  },
  {
    layerCount: 1,
    basemapCounts: {},
    joinCounts: {},
    layerCounts: { es_agg_heatmap: 1 },
    resolutionCounts: { coarse: 1 },
    scalingCounts: {},
    emsFileCounts: {},
    layerTypeCounts: { HEATMAP: 1 },
    sourceCount: 1,
  },
];

const testsToRun = mapSavedObjects.map(
  (savedObject: { attributes: MapSavedObjectAttributes }, index: number) => {
    const { attributes } = savedObject;
    return [attributes, expecteds[index]] as const;
  }
);

describe.each(testsToRun)('LayerStatsCollector %#', (attributes, expected) => {
  const statsCollector = new LayerStatsCollector(attributes);
  test('getLayerCount', () => {
    expect(statsCollector.getLayerCount()).toBe(expected.layerCount);
  });

  test('getBasemapCounts', () => {
    expect(statsCollector.getBasemapCounts()).toEqual(expected.basemapCounts);
  });

  test('getJoinCounts', () => {
    expect(statsCollector.getJoinCounts()).toEqual(expected.joinCounts);
  });

  test('getLayerCounts', () => {
    expect(statsCollector.getLayerCounts()).toEqual(expected.layerCounts);
  });

  test('getLayerTypeCounts', () => {
    expect(statsCollector.getLayerTypeCounts()).toEqual(expected.layerTypeCounts);
  });

  test('getResolutionCounts', () => {
    expect(statsCollector.getResolutionCounts()).toEqual(expected.resolutionCounts);
  });

  test('getScalingCounts', () => {
    expect(statsCollector.getScalingCounts()).toEqual(expected.scalingCounts);
  });

  test('getEmsFileCounts', () => {
    expect(statsCollector.getEmsFileCounts()).toEqual(expected.emsFileCounts);
  });

  test('getSourceCount', () => {
    expect(statsCollector.getSourceCount()).toEqual(expected.sourceCount);
  });
});
