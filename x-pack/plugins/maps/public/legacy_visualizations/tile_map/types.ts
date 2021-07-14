/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateTileMapLayerDescriptorParams } from '../../classes/layers/create_tile_map_layer_descriptor';

export enum MapTypes {
  ScaledCircleMarkers = 'Scaled Circle Markers',
  ShadedCircleMarkers = 'Shaded Circle Markers',
  ShadedGeohashGrid = 'Shaded Geohash Grid',
  Heatmap = 'Heatmap',
}

export interface TileMapVisParams {
  colorSchema: string;
  mapType: MapTypes;
  mapZoom: number;
  mapCenter: [number, number];
}

export interface TileMapVisConfig extends TileMapVisParams {
  layerDescriptorParams: CreateTileMapLayerDescriptorParams;
}
