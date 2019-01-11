/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import _ from 'lodash';
import { TileLayer } from '../shared/layers/tile_layer';
import { VectorLayer } from '../shared/layers/vector_layer';
import { HeatmapLayer } from '../shared/layers/heatmap_layer';
import { ALL_SOURCES } from '../shared/layers/sources/all_sources';
import { VectorStyle } from '../shared/layers/styles/vector_style';
import { HeatmapStyle } from '../shared/layers/styles/heatmap_style';
import { TileStyle } from '../shared/layers/styles/tile_style';
import { timefilter } from 'ui/timefilter';

function createLayerInstance(layerDescriptor, dataSources) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor, dataSources);
  const style = createStyleInstance(layerDescriptor.style);
  switch (layerDescriptor.type) {
    case TileLayer.type:
      return new TileLayer({ layerDescriptor, source, style });
    case VectorLayer.type:
      return new VectorLayer({ layerDescriptor, source, style });
    case HeatmapLayer.type:
      return new HeatmapLayer({ layerDescriptor, source, style });
    default:
      throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(sourceDescriptor, dataSources) {

  const dataMeta = {
    emsTmsServices: _.get(dataSources, 'ems.tms', []),
    emsFileLayers: _.get(dataSources, 'ems.file', []),
    ymlFileLayers: _.get(dataSources, 'kibana.regionmap', [])
  };

  const Source = ALL_SOURCES.find(Source => {
    return Source.type === sourceDescriptor.type;
  });
  if (!Source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new Source(sourceDescriptor, dataMeta);
}


function createStyleInstance(styleDescriptor) {

  if (!styleDescriptor || !styleDescriptor.type) {
    return null;
  }

  switch (styleDescriptor.type) {
    case VectorStyle.type:
      return new VectorStyle(styleDescriptor);
    case TileStyle.type:
      return new TileStyle(styleDescriptor);
    case HeatmapStyle.type:
      return new HeatmapStyle(styleDescriptor);
    default:
      throw new Error(`Unrecognized styleType ${styleDescriptor.type}`);
  }
}

export const getMapState = ({ map }) => map && map.mapState;

export const getMapReady = ({ map }) => map && map.ready;

export const getGoto = ({ map }) => map && map.goto;

const getSelectedLayerId = ({ map }) => {
  return (!map.selectedLayerId || !map.layerList) ? null : map.selectedLayerId;
};

export const getLayerListRaw = ({ map }) => map.layerList ?  map.layerList : [];

export const getWaitingForMapReadyLayerListRaw = ({ map }) => map.waitingForMapReadyLayerList
  ? map.waitingForMapReadyLayerList
  : [];

export const getMapExtent = ({ map }) => map.mapState.extent ?
  map.mapState.extent : {};

export const getMapBuffer = ({ map }) => map.mapState.buffer ?
  map.mapState.buffer : {};

export const getMapZoom = ({ map }) => map.mapState.zoom ?
  map.mapState.zoom : 0;

export const getMapCenter = ({ map }) => map.mapState.center ?
  map.mapState.center : { lat: 0, lon: 0 };

export const getMouseCoordinates = ({ map }) => map.mapState.mouseCoordinates;

export const getMapColors = ({ map }) => {
  return map.layerList.reduce((accu, layer) => {
    // This will evolve as color options are expanded
    if (!layer.temporary) {
      const color = _.get(layer, 'style.properties.fillColor.options.color');
      if (color) accu.push(color);
    }
    return accu;
  }, []);
};

export const getTimeFilters = ({ map }) => map.mapState.timeFilters ?
  map.mapState.timeFilters : timefilter.getTime();

export const getQuery = ({ map }) => map.mapState.query;

export const getRefreshConfig = ({ map }) => map.mapState.refreshConfig;

export const getRefreshTimerLastTriggeredAt = ({ map }) => map.mapState.refreshTimerLastTriggeredAt;

export const getMetadata = ({ config }) => config && config.meta;

export const getDataFilters = createSelector(
  getMapExtent,
  getMapBuffer,
  getMapZoom,
  getTimeFilters,
  getRefreshTimerLastTriggeredAt,
  getQuery,
  (mapExtent, mapBuffer, mapZoom, timeFilters, refreshTimerLastTriggeredAt, query) => {
    return {
      extent: mapExtent,
      buffer: mapBuffer,
      zoom: mapZoom,
      timeFilters,
      refreshTimerLastTriggeredAt,
      query,
    };
  }
);

export const getDataSources = createSelector(getMetadata, metadata => metadata ? metadata.data_sources : null);

export const getLayerList = createSelector(
  getLayerListRaw,
  getDataSources,
  (layerDescriptorList, dataSources) => {
    return layerDescriptorList.map(layerDescriptor =>
      createLayerInstance(layerDescriptor, dataSources));
  });

export const getSelectedLayer = createSelector(
  getSelectedLayerId,
  getLayerList,
  (selectedLayerId, layerList) => {
    return layerList.find(layer => layer.getId() === selectedLayerId);
  });

export const getSelectedLayerJoinDescriptors = createSelector(
  getSelectedLayer,
  (selectedLayer) => {
    return selectedLayer.getJoins().map(join => {
      return join.toDescriptor();
    });
  });

export const getUniqueIndexPatternIds = createSelector(
  getLayerList,
  (layerList) => {
    const indexPatternIds = [];
    layerList.forEach(layer => {
      indexPatternIds.push(...layer.getIndexPatternIds());
    });
    return _.uniq(indexPatternIds);
  }
);

export const getTemporaryLayers = createSelector(getLayerList, (layerList) => layerList.filter(layer => layer.isTemporary()));
