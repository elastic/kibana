/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import _ from 'lodash';
import { TileLayer } from '../shared/layers/tile_layer';
import { VectorLayer } from '../shared/layers/vector_layer';
import { GeohashGridLayer } from '../shared/layers/geohashgrid_layer';
import { EMSFileSource } from '../shared/layers/sources/ems_file_source';
import { KibanaRegionmapSource } from '../shared/layers/sources/kibana_regionmap_source';
import { XYZTMSSource } from '../shared/layers/sources/xyz_tms_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';
import { KibanaTilemapSource } from '../shared/layers/sources/kibana_tilemap_source';
import { ESGeohashGridSource } from '../shared/layers/sources/es_geohashgrid_source';
import { ESSearchSource } from '../shared/layers/sources/es_search_source';
import { VectorStyle } from '../shared/layers/styles/vector_style';
import { HeatmapStyle } from '../shared/layers/styles/heatmap_style';

function createLayerInstance(layerDescriptor, dataSources) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor, dataSources);
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

function createSourceInstance(sourceDescriptor, dataSources) {
  switch (sourceDescriptor.type) {
    case XYZTMSSource.type:
      return new XYZTMSSource(sourceDescriptor);
    case EMSTMSSource.type:
      const emsTmsServices = _.get(dataSources, 'ems.tms', []);
      return new EMSTMSSource(sourceDescriptor, emsTmsServices);
    case KibanaTilemapSource.type:
      return new KibanaTilemapSource(sourceDescriptor);
    case EMSFileSource.type:
      const emsregions = _.get(dataSources, 'ems.file', []);
      return new EMSFileSource(sourceDescriptor, emsregions);
    case KibanaRegionmapSource.type:
      const regions = _.get(dataSources, 'kibana.regionmap', []);
      return new KibanaRegionmapSource(sourceDescriptor, regions);
    case ESGeohashGridSource.type:
      return new ESGeohashGridSource(sourceDescriptor);
    case ESSearchSource.type:
      return new ESSearchSource(sourceDescriptor);
    default:
      throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
}


function createStyleInstance(styleDescriptor) {

  if (!styleDescriptor || !styleDescriptor.type) {
    return null;
  }

  switch (styleDescriptor.type) {
    case VectorStyle.type:
      return new VectorStyle(styleDescriptor);
    case HeatmapStyle.type:
      return new HeatmapStyle(styleDescriptor);
    default:
      throw new Error(`Unrecognized styleType ${styleDescriptor.type}`);
  }
}

export const getMapState = ({ map }) => map && map.mapState;

export const getMapReady = ({ map }) => map && map.ready;


const getSelectedLayerId = ({ map }) => {
  return (!map.selectedLayerId || !map.layerList) ? null : map.selectedLayerId;
};

export const getLayerListRaw = ({ map }) => map.layerList ?  map.layerList : [];

export const getMapExtent = ({ map }) => map.mapState.extent ?
  map.mapState.extent : {};

export const getMapBuffer = ({ map }) => map.mapState.buffer ?
  map.mapState.extent : {};

export const getMapZoom = ({ map }) => map.mapState.zoom ?
  map.mapState.zoom : 0;

export const getMapCenter = ({ map }) => map.mapState.center ?
  map.mapState.center : { lat: 0, lon: 0 };

export const getMapColors = ({ map }) => {
  return map.layerList.reduce((accu, layer) => {
    // This will evolve as color options are expanded
    if (!layer.temporary) {
      const color = _.get(layer, 'style.properties.fillColor.options.color', null);
      if (color) accu.push(color);
    }
    return accu;
  }, []);
};

export const getTimeFilters = ({ map }) => map.mapState.timeFilters;

export const getMetadata = ({ config }) => config && config.meta;

export const getDataFilters = createSelector(
  getMapExtent,
  getMapBuffer,
  getMapZoom,
  getTimeFilters,
  (mapExtent, mapBuffer, mapZoom, timeFilters) => {
    return {
      extent: mapExtent,
      buffer: mapBuffer,
      zoom: mapZoom,
      timeFilters: timeFilters
    };
  }
);

export const getDataSources = createSelector(getMetadata, metadata => metadata ? metadata.data_sources : null);

export const getSelectedLayer = createSelector(
  getSelectedLayerId,
  getLayerListRaw,
  getDataSources,
  (selectedLayerId, layerList, dataSources) => {
    const selectedLayer = layerList.find(layerDescriptor => layerDescriptor.id === selectedLayerId);
    return createLayerInstance(selectedLayer, dataSources);
  });

export const getLayerList = createSelector(
  getLayerListRaw,
  getDataSources,
  (layerList, dataSources) => {
    return layerList.map(layerDescriptor => createLayerInstance(layerDescriptor, dataSources));
  });

export const getTemporaryLayers = createSelector(getLayerList, (layerList) => layerList.filter(layer => layer.isTemporary()));
