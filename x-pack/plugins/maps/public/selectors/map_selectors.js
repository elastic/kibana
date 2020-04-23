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
import { BlendedVectorLayer } from '../layers/blended_vector_layer';
import { getTimeFilter } from '../kibana_services';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { TiledVectorLayer } from '../layers/tiled_vector_layer';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../reducers/util';
import { InnerJoin } from '../layers/joins/inner_join';
import { getSourceByType } from '../layers/sources/source_registry';
import { GeojsonFileSource } from '../layers/sources/client_file_source';
import {
  LAYER_TYPE,
  SOURCE_DATA_ID_ORIGIN,
  STYLE_TYPE,
  VECTOR_STYLES,
  SPATIAL_FILTERS_LAYER_ID,
} from '../../common/constants';
import { extractFeaturesFromFilters } from '../elasticsearch_geo_utils';

function createLayerInstance(layerDescriptor, inspectorAdapters) {
  const source = createSourceInstance(layerDescriptor.sourceDescriptor, inspectorAdapters);

  switch (layerDescriptor.type) {
    case TileLayer.type:
      return new TileLayer({ layerDescriptor, source });
    case VectorLayer.type:
      const joins = [];
      if (layerDescriptor.joins) {
        layerDescriptor.joins.forEach(joinDescriptor => {
          const join = new InnerJoin(joinDescriptor, source);
          joins.push(join);
        });
      }
      return new VectorLayer({ layerDescriptor, source, joins });
    case VectorTileLayer.type:
      return new VectorTileLayer({ layerDescriptor, source });
    case HeatmapLayer.type:
      return new HeatmapLayer({ layerDescriptor, source });
    case BlendedVectorLayer.type:
      return new BlendedVectorLayer({ layerDescriptor, source });
    case TiledVectorLayer.type:
      return new TiledVectorLayer({ layerDescriptor, source });
    default:
      throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(sourceDescriptor, inspectorAdapters) {
  const source = getSourceByType(sourceDescriptor.type);
  if (!source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new source.ConstructorFunction(sourceDescriptor, inspectorAdapters);
}

export const getMapSettings = ({ map }) => map.settings;

const getRollbackMapSettings = ({ map }) => map.__rollbackSettings;

export const hasMapSettingsChanges = createSelector(
  getMapSettings,
  getRollbackMapSettings,
  (settings, rollbackSettings) => {
    return rollbackSettings ? !_.isEqual(settings, rollbackSettings) : false;
  }
);

export const getOpenTooltips = ({ map }) => {
  return map && map.openTooltips ? map.openTooltips : [];
};

export const getHasLockedTooltips = state => {
  return getOpenTooltips(state).some(({ isLocked }) => {
    return isLocked;
  });
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
  map.mapState.timeFilters ? map.mapState.timeFilters : getTimeFilter().getTime();

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

  const refreshInterval = getTimeFilter().getRefreshInterval();
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
};

export const getRefreshTimerLastTriggeredAt = ({ map }) => map.mapState.refreshTimerLastTriggeredAt;

function getLayerDescriptor(state = {}, layerId) {
  const layerListRaw = getLayerListRaw(state);
  return layerListRaw.find(layer => layer.id === layerId);
}

export function getDataRequestDescriptor(state = {}, layerId, dataId) {
  const layerDescriptor = getLayerDescriptor(state, layerId);
  if (!layerDescriptor || !layerDescriptor.__dataRequests) {
    return;
  }
  return _.get(layerDescriptor, '__dataRequests', []).find(dataRequest => {
    return dataRequest.dataId === dataId;
  });
}

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

export const getSpatialFiltersLayer = createSelector(
  getFilters,
  getMapSettings,
  (filters, settings) => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: extractFeaturesFromFilters(filters),
    };
    const geoJsonSourceDescriptor = GeojsonFileSource.createDescriptor(
      featureCollection,
      'spatialFilters'
    );

    return new VectorLayer({
      layerDescriptor: {
        id: SPATIAL_FILTERS_LAYER_ID,
        visible: settings.showSpatialFilters,
        alpha: settings.spatialFiltersAlpa,
        type: LAYER_TYPE.VECTOR,
        __dataRequests: [
          {
            dataId: SOURCE_DATA_ID_ORIGIN,
            data: featureCollection,
          },
        ],
        style: {
          properties: {
            [VECTOR_STYLES.FILL_COLOR]: {
              type: STYLE_TYPE.STATIC,
              options: {
                color: settings.spatialFiltersFillColor,
              },
            },
            [VECTOR_STYLES.LINE_COLOR]: {
              type: STYLE_TYPE.STATIC,
              options: {
                color: settings.spatialFiltersLineColor,
              },
            },
          },
        },
      },
      source: new GeojsonFileSource(geoJsonSourceDescriptor),
    });
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
