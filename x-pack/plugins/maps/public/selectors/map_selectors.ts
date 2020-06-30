/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { FeatureCollection } from 'geojson';
import _ from 'lodash';
import { Adapters } from 'src/plugins/inspector/public';
import { TileLayer } from '../classes/layers/tile_layer/tile_layer';
// @ts-ignore
import { VectorTileLayer } from '../classes/layers/vector_tile_layer/vector_tile_layer';
import { IVectorLayer, VectorLayer } from '../classes/layers/vector_layer/vector_layer';
import { VectorStyle } from '../classes/styles/vector/vector_style';
// @ts-ignore
import { HeatmapLayer } from '../classes/layers/heatmap_layer/heatmap_layer';
import { BlendedVectorLayer } from '../classes/layers/blended_vector_layer/blended_vector_layer';
import { getTimeFilter } from '../kibana_services';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { TiledVectorLayer } from '../classes/layers/tiled_vector_layer/tiled_vector_layer';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../reducers/util';
import { IJoin } from '../classes/joins/join';
import { InnerJoin } from '../classes/joins/inner_join';
import { getSourceByType } from '../classes/sources/source_registry';
import { GeojsonFileSource } from '../classes/sources/geojson_file_source';
import {
  LAYER_TYPE,
  SOURCE_DATA_REQUEST_ID,
  STYLE_TYPE,
  VECTOR_STYLES,
  SPATIAL_FILTERS_LAYER_ID,
} from '../../common/constants';
// @ts-ignore
import { extractFeaturesFromFilters } from '../elasticsearch_geo_utils';
import { MapStoreState } from '../reducers/store';
import {
  DataRequestDescriptor,
  DrawState,
  Goto,
  LayerDescriptor,
  MapCenter,
  MapExtent,
  MapQuery,
  MapRefreshConfig,
  TooltipState,
  VectorLayerDescriptor,
} from '../../common/descriptor_types';
import { MapSettings } from '../reducers/map';
import { Filter, TimeRange } from '../../../../../src/plugins/data/public';
import { ISource } from '../classes/sources/source';
import { ITMSSource } from '../classes/sources/tms_source';
import { IVectorSource } from '../classes/sources/vector_source';
import { ILayer } from '../classes/layers/layer';

function createLayerInstance(
  layerDescriptor: LayerDescriptor,
  inspectorAdapters: Adapters
): ILayer {
  const source: ISource = createSourceInstance(layerDescriptor.sourceDescriptor, inspectorAdapters);

  switch (layerDescriptor.type) {
    case TileLayer.type:
      return new TileLayer({ layerDescriptor, source: source as ITMSSource });
    case VectorLayer.type:
      const joins: IJoin[] = [];
      const vectorLayerDescriptor = layerDescriptor as VectorLayerDescriptor;
      if (vectorLayerDescriptor.joins) {
        vectorLayerDescriptor.joins.forEach((joinDescriptor) => {
          const join = new InnerJoin(joinDescriptor, source);
          joins.push(join);
        });
      }
      return new VectorLayer({
        layerDescriptor: vectorLayerDescriptor,
        source: source as IVectorSource,
        joins,
      });
    case VectorTileLayer.type:
      return new VectorTileLayer({ layerDescriptor, source });
    case HeatmapLayer.type:
      return new HeatmapLayer({ layerDescriptor, source });
    case BlendedVectorLayer.type:
      return new BlendedVectorLayer({
        layerDescriptor: layerDescriptor as VectorLayerDescriptor,
        source: source as IVectorSource,
      });
    case TiledVectorLayer.type:
      return new TiledVectorLayer({
        layerDescriptor: layerDescriptor as VectorLayerDescriptor,
        source: source as IVectorSource,
      });
    default:
      throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(sourceDescriptor: any, inspectorAdapters: Adapters): ISource {
  const source = getSourceByType(sourceDescriptor.type);
  if (!source) {
    throw new Error(`Unrecognized sourceType ${sourceDescriptor.type}`);
  }
  return new source.ConstructorFunction(sourceDescriptor, inspectorAdapters);
}

export const getMapSettings = ({ map }: MapStoreState): MapSettings => map.settings;

const getRollbackMapSettings = ({ map }: MapStoreState): MapSettings | null =>
  map.__rollbackSettings;

export const hasMapSettingsChanges = createSelector(
  getMapSettings,
  getRollbackMapSettings,
  (settings, rollbackSettings) => {
    return rollbackSettings ? !_.isEqual(settings, rollbackSettings) : false;
  }
);

export const getOpenTooltips = ({ map }: MapStoreState): TooltipState[] => {
  return map && map.openTooltips ? map.openTooltips : [];
};

export const getHasLockedTooltips = (state: MapStoreState): boolean => {
  return getOpenTooltips(state).some(({ isLocked }: TooltipState) => {
    return isLocked;
  });
};

export const getMapReady = ({ map }: MapStoreState): boolean => map && map.ready;

export const getMapInitError = ({ map }: MapStoreState): string | null | undefined =>
  map.mapInitError;

export const getGoto = ({ map }: MapStoreState): Goto | null | undefined => map && map.goto;

export const getSelectedLayerId = ({ map }: MapStoreState): string | null => {
  return !map.selectedLayerId || !map.layerList ? null : map.selectedLayerId;
};

export const getLayerListRaw = ({ map }: MapStoreState): LayerDescriptor[] =>
  map.layerList ? map.layerList : [];

export const getWaitingForMapReadyLayerListRaw = ({ map }: MapStoreState): LayerDescriptor[] =>
  map.waitingForMapReadyLayerList ? map.waitingForMapReadyLayerList : [];

export const getScrollZoom = ({ map }: MapStoreState): boolean => map.mapState.scrollZoom;

export const isInteractiveDisabled = ({ map }: MapStoreState): boolean =>
  map.mapState.disableInteractive;

export const isTooltipControlDisabled = ({ map }: MapStoreState): boolean =>
  map.mapState.disableTooltipControl;

export const isToolbarOverlayHidden = ({ map }: MapStoreState): boolean =>
  map.mapState.hideToolbarOverlay;

export const isLayerControlHidden = ({ map }: MapStoreState): boolean =>
  map.mapState.hideLayerControl;

export const isViewControlHidden = ({ map }: MapStoreState): boolean =>
  map.mapState.hideViewControl;

export const getMapExtent = ({ map }: MapStoreState): MapExtent | undefined => map.mapState.extent;

export const getMapBuffer = ({ map }: MapStoreState): MapExtent | undefined => map.mapState.buffer;

export const getMapZoom = ({ map }: MapStoreState): number =>
  map.mapState.zoom ? map.mapState.zoom : 0;

export const getMapCenter = ({ map }: MapStoreState): MapCenter =>
  map.mapState.center ? map.mapState.center : { lat: 0, lon: 0 };

export const getMouseCoordinates = ({ map }: MapStoreState) => map.mapState.mouseCoordinates;

export const getTimeFilters = ({ map }: MapStoreState): TimeRange =>
  map.mapState.timeFilters ? map.mapState.timeFilters : getTimeFilter().getTime();

export const getQuery = ({ map }: MapStoreState): MapQuery | undefined => map.mapState.query;

export const getFilters = ({ map }: MapStoreState): Filter[] => map.mapState.filters;

export const isUsingSearch = (state: MapStoreState): boolean => {
  const filters = getFilters(state).filter((filter) => !filter.meta.disabled);
  const queryString = _.get(getQuery(state), 'query', '');
  return !!filters.length || !!queryString.length;
};

export const getDrawState = ({ map }: MapStoreState): DrawState | undefined =>
  map.mapState.drawState;

export const isDrawingFilter = ({ map }: MapStoreState): boolean => {
  return !!map.mapState.drawState;
};

export const getRefreshConfig = ({ map }: MapStoreState): MapRefreshConfig => {
  if (map.mapState.refreshConfig) {
    return map.mapState.refreshConfig;
  }

  const refreshInterval = getTimeFilter().getRefreshInterval();
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
};

export const getRefreshTimerLastTriggeredAt = ({ map }: MapStoreState): string | undefined =>
  map.mapState.refreshTimerLastTriggeredAt;

function getLayerDescriptor(state: MapStoreState, layerId: string) {
  const layerListRaw = getLayerListRaw(state);
  return layerListRaw.find((layer) => layer.id === layerId);
}

export function getDataRequestDescriptor(state: MapStoreState, layerId: string, dataId: string) {
  const layerDescriptor = getLayerDescriptor(state, layerId);
  if (!layerDescriptor || !layerDescriptor.__dataRequests) {
    return;
  }
  return layerDescriptor.__dataRequests.find((dataRequest: DataRequestDescriptor) => {
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
    const featureCollection: FeatureCollection = {
      type: 'FeatureCollection',
      features: extractFeaturesFromFilters(filters),
    };
    const geoJsonSourceDescriptor = GeojsonFileSource.createDescriptor(
      featureCollection,
      'spatialFilters'
    );

    return new VectorLayer({
      layerDescriptor: VectorLayer.createDescriptor({
        id: SPATIAL_FILTERS_LAYER_ID,
        visible: settings.showSpatialFilters,
        alpha: settings.spatialFiltersAlpa,
        __dataRequests: [
          {
            dataId: SOURCE_DATA_REQUEST_ID,
            data: featureCollection,
          },
        ],
        style: VectorStyle.createDescriptor({
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
        }),
      }),
      source: new GeojsonFileSource(geoJsonSourceDescriptor),
    });
  }
);

export const getLayerList = createSelector(
  getLayerListRaw,
  getInspectorAdapters,
  (layerDescriptorList, inspectorAdapters) => {
    return layerDescriptorList.map((layerDescriptor) =>
      createLayerInstance(layerDescriptor, inspectorAdapters)
    );
  }
);

export function getLayerById(layerId: string | null, state: MapStoreState): ILayer | undefined {
  return getLayerList(state).find((layer) => {
    return layerId === layer.getId();
  });
}

export const getFittableLayers = createSelector(getLayerList, (layerList) => {
  return layerList.filter((layer) => {
    // These are the only layer-types that implement bounding-box retrieval reliably
    // This will _not_ work if Maps will allow register custom layer types
    const isFittable =
      layer.getType() === LAYER_TYPE.VECTOR ||
      layer.getType() === LAYER_TYPE.BLENDED_VECTOR ||
      layer.getType() === LAYER_TYPE.HEATMAP;

    return isFittable && layer.isVisible();
  });
});

export const getHiddenLayerIds = createSelector(getLayerListRaw, (layers) =>
  layers.filter((layer) => !layer.visible).map((layer) => layer.id)
);

export const getSelectedLayer = createSelector(
  getSelectedLayerId,
  getLayerList,
  (selectedLayerId, layerList) => {
    return layerList.find((layer) => layer.getId() === selectedLayerId);
  }
);

export const hasPreviewLayers = createSelector(getLayerList, (layerList) => {
  return layerList.some((layer) => {
    return layer.isPreviewLayer();
  });
});

export const isLoadingPreviewLayers = createSelector(getLayerList, (layerList) => {
  return layerList.some((layer) => {
    return layer.isPreviewLayer() && layer.isLayerLoading();
  });
});

export const getMapColors = createSelector(getLayerListRaw, (layerList) =>
  layerList
    .filter((layerDescriptor) => {
      return !layerDescriptor.__isPreviewLayer;
    })
    .reduce((accu: string[], layerDescriptor: LayerDescriptor) => {
      const color: string | undefined = _.get(
        layerDescriptor,
        'style.properties.fillColor.options.color'
      );
      if (color) accu.push(color);
      return accu;
    }, [])
);

export const getSelectedLayerJoinDescriptors = createSelector(getSelectedLayer, (selectedLayer) => {
  if (!selectedLayer || !('getJoins' in selectedLayer)) {
    return [];
  }

  return (selectedLayer as IVectorLayer).getJoins().map((join: IJoin) => {
    return join.toDescriptor();
  });
});

// Get list of unique index patterns used by all layers
export const getUniqueIndexPatternIds = createSelector(getLayerList, (layerList) => {
  const indexPatternIds: string[] = [];
  layerList.forEach((layer) => {
    indexPatternIds.push(...layer.getIndexPatternIds());
  });
  return _.uniq(indexPatternIds).sort();
});

// Get list of unique index patterns, excluding index patterns from layers that disable applyGlobalQuery
export const getQueryableUniqueIndexPatternIds = createSelector(getLayerList, (layerList) => {
  const indexPatternIds: string[] = [];
  layerList.forEach((layer) => {
    indexPatternIds.push(...layer.getQueryableIndexPatternIds());
  });
  return _.uniq(indexPatternIds);
});

export const hasDirtyState = createSelector(getLayerListRaw, (layerListRaw) => {
  return layerListRaw.some((layerDescriptor) => {
    if (layerDescriptor.__isPreviewLayer) {
      return true;
    }

    const trackedState = layerDescriptor[TRACKED_LAYER_DESCRIPTOR];
    if (!trackedState) {
      return false;
    }
    const currentState = copyPersistentState(layerDescriptor);
    return !_.isEqual(currentState, trackedState);
  });
});

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
