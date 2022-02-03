/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SOURCE_TYPES } from '../constants';

function isEmsTileSource(layerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === SOURCE_TYPES.EMS_TMS;
}

function isTileLayer(layerDescriptor) {
  const layerType = _.get(layerDescriptor, 'type');
  // can not use LAYER_TYPE because LAYER_TYPE.TILE does not exist >8.1
  return layerType === 'TILE';
}

export function emsRasterTileToEmsVectorTile({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  let layerList = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layer) => {
    if (isTileLayer(layer) && isEmsTileSource(layer)) {
      // Just need to switch layer type to migrate TILE layer to VECTOR_TILE layer
      // can not use LAYER_TYPE because LAYER_TYPE.VECTOR_TILE does not exist >8.1
      layer.type = 'VECTOR_TILE';
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
