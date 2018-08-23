/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { TileLayer } from '../shared/layers/tile_layer';
import { VectorLayer } from '../shared/layers/vector_layer';
import { GeohashGridLayer } from '../shared/layers/geohashgrid_layer';
import { EMSFileSource } from '../shared/layers/sources/ems_file_source';
import { XYZTMSSource } from '../shared/layers/sources/xyz_tms_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';
import { ESGeohashGridSource } from '../shared/layers/sources/es_geohashgrid_source';

export const getMapConstants = ({ map }) => map && map.mapConstants;

export const getSelectedLayerInstance = ({ map }) => {
  if (!map.selectedLayerId || !map.layerList) {
    return null;
  }
  const selectedLayer = map.layerList.find(layerDescriptor => layerDescriptor.id === map.selectedLayerId);
  return createLayerInstance(selectedLayer);
};

function createLayerInstance(layerDescriptor) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor);
  if (layerDescriptor.type === TileLayer.type) {
    return new TileLayer({ layerDescriptor, source });
  } else if (layerDescriptor.type === VectorLayer.type) {
    return new VectorLayer({ layerDescriptor, source });
  } else if (layerDescriptor.type === GeohashGridLayer.type) {
    return new GeohashGridLayer({ layerDescriptor, source });
  } else {
    throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(sourceDescriptor) {
  if (sourceDescriptor.type === XYZTMSSource.type) {
    return new XYZTMSSource(sourceDescriptor);
  } else if (sourceDescriptor.type === EMSTMSSource.type) {
    return new EMSTMSSource(sourceDescriptor);
  } else if (sourceDescriptor.type === EMSFileSource.type) {
    return new EMSFileSource(sourceDescriptor);
  } else if (sourceDescriptor.type === ESGeohashGridSource.type) {
    return new ESGeohashGridSource(sourceDescriptor);
  } else {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
}
export const getLayerList = ({ map }) => map && map.layerList;

export const getLayerInstanceList = ({ map }) => {
  return map.layerList ?  map.layerList.map(layerDescriptor => createLayerInstance(layerDescriptor)) : [];
};

export const getLayerLoading = ({ map }) => map && map.layerLoading;

export const getTemporaryLayers = createSelector(getLayerInstanceList, (layerList) => layerList.filter(layer => layer.isTemporary()));
