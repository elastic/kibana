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
import { KibanaRegionmapSource } from '../shared/layers/sources/kibana_regionmap_source';
import { XYZTMSSource } from '../shared/layers/sources/xyz_tms_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';
import { KibanaTilemapSource } from '../shared/layers/sources/kibana_tilemap_source';
import { ESGeohashGridSource } from '../shared/layers/sources/es_geohashgrid_source';
import { FillAndOutlineStyle } from '../shared/layers/styles/fill_and_outline_style';
import { HeatmapStyle } from '../shared/layers/styles/heatmap_style';

function createLayerInstance(layerDescriptor) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor);
  const style = createStyleInstance(layerDescriptor.style);
  switch (layerDescriptor.type) {
    case TileLayer.type:
      return new TileLayer({ layerDescriptor, source, style });
    case VectorLayer.type:
      return new VectorLayer({ layerDescriptor, source, style });
    case GeohashGridLayer.type:
      return new GeohashGridLayer({ layerDescriptor, source, style });
    default:
      throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(sourceDescriptor) {
  switch (sourceDescriptor.type) {
    case XYZTMSSource.type:
      return new XYZTMSSource(sourceDescriptor);
    case EMSTMSSource.type:
      return new EMSTMSSource(sourceDescriptor);
    case KibanaTilemapSource.type:
      return new KibanaTilemapSource(sourceDescriptor);
    case EMSFileSource.type:
      return new EMSFileSource(sourceDescriptor);
    case KibanaRegionmapSource.type:
      return new KibanaRegionmapSource(sourceDescriptor);
    case ESGeohashGridSource.type:
      return new ESGeohashGridSource(sourceDescriptor);
    default:
      throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
}


function createStyleInstance(styleDescriptor) {

  if (!styleDescriptor || !styleDescriptor.type) {
    return null;
  }

  switch (styleDescriptor.type) {
    case FillAndOutlineStyle.type:
      return new FillAndOutlineStyle(styleDescriptor);
    case HeatmapStyle.type:
      return new HeatmapStyle(styleDescriptor);
    default:
      throw new Error(`Unrecognized styleType ${styleDescriptor.type}`);
  }
}


export const getMapState = ({ map }) => map && map.mapState;


const getSelectedLayerId = createSelector(({ map }) => {
  return (!map.selectedLayerId || !map.layerList) ? null : map.selectedLayerId;
}, x => x);

const getLayerListRaw = createSelector(({ map }) => {
  return map.layerList ?  map.layerList : [];
}, x => x);

export function getMetadata({ config }) {
  return config && config.meta || {};
}

export const getDataSources = createSelector(
  getMetadata,
  metadata => metadata.data_sources || {}
);

export const getSelectedLayer = createSelector(getSelectedLayerId, getLayerListRaw, (selectedLayerId, layerList) => {
  const selectedLayer = layerList.find(layerDescriptor => layerDescriptor.id === selectedLayerId);
  return createLayerInstance(selectedLayer);
});

export const getLayerList = createSelector(getLayerListRaw, (layerList) => {
  return layerList.map(layerDescriptor => createLayerInstance(layerDescriptor));
});

export const getTemporaryLayers = createSelector(getLayerList, (layerList) => layerList.filter(layer => layer.isTemporary()));
