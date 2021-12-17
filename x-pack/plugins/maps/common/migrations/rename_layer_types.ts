/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_TYPE } from '../constants';
import { LayerDescriptor } from '../descriptor_types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

// LAYER_TYPE constants renamed in 8.1 to provide more distinguishable names that better refect layer.
// TILED_VECTOR replaced with MVT_VECTOR
// VECTOR_TILE replaced with EMS_VECTOR_TILE
// VECTOR replaced with GEOJSON_VECTOR
// TILE replaced with RASTER_TILE
export function renameLayerTypes({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (layerDescriptor.type === 'TILED_VECTOR') {
      layerDescriptor.type = LAYER_TYPE.MVT_VECTOR;
    } else if (layerDescriptor.type === 'VECTOR_TILE') {
      layerDescriptor.type = LAYER_TYPE.EMS_VECTOR_TILE;
    } else if (layerDescriptor.type === 'VECTOR') {
      layerDescriptor.type = LAYER_TYPE.GEOJSON_VECTOR;
    } else if (layerDescriptor.type === 'TILE') {
      layerDescriptor.type = LAYER_TYPE.RASTER_TILE;
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
