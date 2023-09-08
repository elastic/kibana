/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LayerDescriptor } from '../../../common/descriptor_types';
import { createTileMapLayerDescriptor } from '../../classes/layers/create_tile_map_layer_descriptor';
import type { MapsAppTileMapLocatorParams, MapsAppTileMapLocatorDependencies } from './types';

export async function getLocation(
  params: MapsAppTileMapLocatorParams,
  deps: MapsAppTileMapLocatorDependencies
) {
  const {
    label,
    mapType,
    colorSchema,
    indexPatternId,
    geoFieldName,
    metricAgg,
    metricFieldName,
    filters,
    query,
    timeRange,
    hash = true,
  } = params;
  const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
  const tileMapLayerDescriptor = createTileMapLayerDescriptor({
    label,
    mapType,
    colorSchema,
    indexPatternId,
    geoFieldName,
    metricAgg,
    metricFieldName,
  });

  if (tileMapLayerDescriptor) {
    initialLayers.push(tileMapLayerDescriptor);
  }

  return await deps.locator.getLocation({
    initialLayers,
    filters,
    query,
    timeRange,
    hash,
  });
}
