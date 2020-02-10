/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import _ from 'lodash';
import { TileLayer } from '../layers/tile_layer';
import { VectorTileLayer } from '../layers/vector_tile_layer';
import { VectorLayer } from '../layers/vector_layer';
import { HeatmapLayer } from '../layers/heatmap_layer';
import { ALL_SOURCES } from '../layers/sources/all_sources';
import { timefilter } from 'ui/timefilter';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../reducers/util';

function createLayerInstance(layerDescriptor, inspectorAdapters) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor, inspectorAdapters);

  switch (layerDescriptor.type) {
    case TileLayer.type:
      return new TileLayer({ layerDescriptor, source });
    case VectorLayer.type:
      return new VectorLayer({ layerDescriptor, source });
    case VectorTileLayer.type:
      return new VectorTileLayer({ layerDescriptor, source });
    case HeatmapLayer.type:
      return new HeatmapLayer({ layerDescriptor, source });
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

export const getTooltipState = ({ map }) => {
  return map.tooltipState;
};

export const getMapReady = ({ map }) => map && map.ready;

export const getMapInitError = ({ map }) => map.mapInitError;

export const getGoto = ({ map }) => map && map.goto;

export const getSelectedLayerId = ({ map }) => {
  return !map.selectedLayerId || !map.layerList ? null : map.selectedLayerId;
};

export const getTransientLayerId = ({ map }) => map.__transientLayerId;

export const getLayerListRaw = ({ map }) => (map.layerList ? map.layerList : []);

export const getWaitingForMapReadyLayerListRaw = ({ map }) =>
  map.waitingForMapReadyLayerList ? map.waitingForMapReadyLayerList : [];

export const getScrollZoom = ({ map }) => map.mapState.scrollZoom;

export const isInteractiveDisabled = ({ map }) => map.mapState.disableInteractive;

export const isTooltipControlDisabled = ({ map }) => map.mapState.disableTooltipControl;

export const isToolbarOverlayHidden = ({ map }) => map.mapState.hideToolbarOverlay;

export const isLayerControlHidden = ({ map }) => map.mapState.hideLayerControl;

export const isViewControlHidden = ({ map }) => map.mapState.hideViewControl;

export const getMapExtent = ({ map }) => (map.mapState.extent ? map.mapState.extent : {});

export const getMapBuffer = ({ map }) => (map.mapState.buffer ? map.mapState.buffer : {});

export const getMapZoom = ({ map }) => (map.mapState.zoom ? map.mapState.zoom : 0);

export const getMapCenter = ({ map }) =>
  map.mapState.center ? map.mapState.center : { lat: 0, lon: 0 };

export const getMouseCoordinates = ({ map }) => map.mapState.mouseCoordinates;

export const getTimeFilters = ({ map }) =>
  map.mapState.timeFilters ? map.mapState.timeFilters : timefilter.getTime();

export const getQuery = ({ map }) => map.mapState.query;

export const getFilters = ({ map }) => map.mapState.filters;

export const isUsingSearch = state => {
  const filters = getFilters(state).filter(filter => !filter.meta.disabled);
  const queryString = _.get(getQuery(state), 'query', '');
  return filters.length || queryString.length;
};

export const getDrawState = ({ map }) => map.mapState.drawState;

export const isDrawingFilter = ({ map }) => {
  return !!map.mapState.drawState;
};

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
      createLayerInstance(layerDescriptor, inspectorAdapters)
    );
  }
);

export const getHiddenLayerIds = createSelector(getLayerListRaw, layers =>
  layers.filter(layer => !layer.visible).map(layer => layer.id)
);

export const getSelectedLayer = createSelector(
  getSelectedLayerId,
  getLayerList,
  (selectedLayerId, layerList) => {
    return layerList.find(layer => layer.getId() === selectedLayerId);
  }
);

export const getMapColors = createSelector(
  getTransientLayerId,
  getLayerListRaw,
  (transientLayerId, layerList) =>
    layerList.reduce((accu, layer) => {
      if (layer.id === transientLayerId) {
        return accu;
      }
      const color = _.get(layer, 'style.properties.fillColor.options.color');
      if (color) accu.push(color);
      return accu;
    }, [])
);

export const getSelectedLayerJoinDescriptors = createSelector(getSelectedLayer, selectedLayer => {
  return selectedLayer.getJoins().map(join => {
    return join.toDescriptor();
  });
});

// Get list of unique index patterns used by all layers
export const getUniqueIndexPatternIds = createSelector(getLayerList, layerList => {
  const indexPatternIds = [];
  layerList.forEach(layer => {
    indexPatternIds.push(...layer.getIndexPatternIds());
  });
  return _.uniq(indexPatternIds).sort();
});

// Get list of unique index patterns, excluding index patterns from layers that disable applyGlobalQuery
export const getQueryableUniqueIndexPatternIds = createSelector(getLayerList, layerList => {
  const indexPatternIds = [];
  layerList.forEach(layer => {
    indexPatternIds.push(...layer.getQueryableIndexPatternIds());
  });
  return _.uniq(indexPatternIds);
});

export const hasDirtyState = createSelector(
  getLayerListRaw,
  getTransientLayerId,
  (layerListRaw, transientLayerId) => {
    if (transientLayerId) {
      return true;
    }

    return layerListRaw.some(layerDescriptor => {
      const trackedState = layerDescriptor[TRACKED_LAYER_DESCRIPTOR];
      if (!trackedState) {
        return false;
      }
      const currentState = copyPersistentState(layerDescriptor);
      return !_.isEqual(currentState, trackedState);
    });
  }
);

export const areLayersLoaded = createSelector(
  getLayerList,
  getWaitingForMapReadyLayerListRaw,
  getMapZoom,
  (layerList, waitingForMapReadyLayerList, zoom) => {
    if (waitingForMapReadyLayerList.length) {
      return false;
    }

    for (let i = 0; i < layerList.length; i++) {
      const layer = layerList[i];
      if (layer.isVisible() && layer.showAtZoomLevel(zoom) && !layer.isDataLoaded()) {
        return false;
      }
    }
    return true;
  }
);
