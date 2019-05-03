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
import { getInspectorAdapters } from '../store/non_serializable_instances';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../store/util';

function createLayerInstance(layerDescriptor, inspectorAdapters) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor, inspectorAdapters);
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

function createSourceInstance(sourceDescriptor, inspectorAdapters) {
  const Source = ALL_SOURCES.find(Source => {
    return Source.type === sourceDescriptor.type;
  });
  if (!Source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new Source(sourceDescriptor, inspectorAdapters);
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

export const getTooltipState = ({ map }) => {
  return map.tooltipState;
};

export const getMapReady = ({ map }) => map && map.ready;

export const getGoto = ({ map }) => map && map.goto;

export const getSelectedLayerId = ({ map }) => {
  return (!map.selectedLayerId || !map.layerList) ? null : map.selectedLayerId;
};

export const getTransientLayerId = ({ map }) => map.__transientLayerId;

export const getLayerListRaw = ({ map }) => map.layerList ?  map.layerList : [];

export const getWaitingForMapReadyLayerListRaw = ({ map }) => map.waitingForMapReadyLayerList
  ? map.waitingForMapReadyLayerList
  : [];

export const getScrollZoom = ({ map }) => map.mapState.scrollZoom;

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
    const color = _.get(layer, 'style.properties.fillColor.options.color');
    if (color) accu.push(color);
    return accu;
  }, []);
};

export const getTimeFilters = ({ map }) => map.mapState.timeFilters ?
  map.mapState.timeFilters : timefilter.getTime();

export const getQuery = ({ map }) => map.mapState.query;

export const getFilters = ({ map }) => map.mapState.filters;

export const getDrawState = ({ map }) => map.mapState.drawState;

export const getRefreshConfig = ({ map }) => {
  if (map.mapState.refreshConfig) {
    return map.mapState.refreshConfig;
  }

  const refreshInterval = timefilter.getRefreshInterval();
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
};

export const getRefreshTimerLastTriggeredAt = ({ map }) => map.mapState.refreshTimerLastTriggeredAt;

export const getDataFilters = createSelector(
  getMapExtent,
  getMapBuffer,
  getMapZoom,
  getTimeFilters,
  getRefreshTimerLastTriggeredAt,
  getQuery,
  getFilters,
  (mapExtent, mapBuffer, mapZoom, timeFilters, refreshTimerLastTriggeredAt, query, filters) => {
    return {
      extent: mapExtent,
      buffer: mapBuffer,
      zoom: mapZoom,
      timeFilters,
      refreshTimerLastTriggeredAt,
      query,
      filters,
    };
  }
);


export const getLayerList = createSelector(
  getLayerListRaw,
  getInspectorAdapters,
  (layerDescriptorList, inspectorAdapters) => {
    return layerDescriptorList.map(layerDescriptor =>
      createLayerInstance(layerDescriptor, inspectorAdapters));
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

// Get list of unique index patterns used by all layers
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

// Get list of unique index patterns, excluding index patterns from layers that disable applyGlobalQuery
export const getQueryableUniqueIndexPatternIds = createSelector(
  getLayerList,
  (layerList) => {
    const indexPatternIds = [];
    layerList.forEach(layer => {
      indexPatternIds.push(...layer.getQueryableIndexPatternIds());
    });
    return _.uniq(indexPatternIds);
  }
);

export const hasDirtyState = createSelector(getLayerListRaw, (layerListRaw) => {
  return layerListRaw.some(layerDescriptor => {
    const currentState = copyPersistentState(layerDescriptor);
    const trackedState = layerDescriptor[TRACKED_LAYER_DESCRIPTOR];
    return (trackedState) ? !_.isEqual(currentState, trackedState) : false;
  });
});
