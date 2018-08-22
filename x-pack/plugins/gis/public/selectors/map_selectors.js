/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { TileLayer } from '../shared/layers/tile_layer';
import { VectorLayer } from '../shared/layers/vector_layer';
import { GeohashGridLayer } from '../shared/layers/geohashgrid_layer';

export const getMapConstants = ({ map }) => map && map.mapConstants;

export const getSelectedLayerInstance = ({ map }) => {
  if (!map.selectedLayerId || !map.layerList) {
    return null;
  }
  const selectedLayer = map.layerList.find(layerDescriptor => layerDescriptor.id === map.selectedLayerId);
  return createLayerInstance(selectedLayer);
};

function createLayerInstance(layerDescriptor) {
  if (layerDescriptor.type === TileLayer.type) {
    return new TileLayer(layerDescriptor);
  } else if (layerDescriptor.type === VectorLayer.type) {
    return new VectorLayer(layerDescriptor);
  } else if (layerDescriptor.type === GeohashGridLayer.type) {
    return new GeohashGridLayer(layerDescriptor);
  } else {
    throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

export const getLayerList = ({ map }) => map && map.layerList;

export const getLayerInstanceList = ({ map }) => {
  return map.layerList ?  map.layerList.map(layerDescriptor => createLayerInstance(layerDescriptor)) : [];
};

export const getLayerLoading = ({ map }) => map && map.layerLoading;

export const getTemporaryLayers = createSelector(getLayerInstanceList, (layerList) => layerList.filter(layer => layer.isTemporary()));
