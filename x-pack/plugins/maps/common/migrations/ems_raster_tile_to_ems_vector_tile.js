/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SOURCE_TYPES, LAYER_TYPE } from '../constants';

function isEmsTileSource(layerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === SOURCE_TYPES.EMS_TMS;
}

function isTileLayer(layerDescriptor) {
  const layerType = _.get(layerDescriptor, 'type');
  return layerType === LAYER_TYPE.TILE;
}

export function emsRasterTileToEmsVectorTile({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layer) => {
    if (isTileLayer(layer) && isEmsTileSource(layer)) {
      // Just need to switch layer type to migrate TILE layer to VECTOR_TILE layer
      layer.type = LAYER_TYPE.VECTOR_TILE;
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
