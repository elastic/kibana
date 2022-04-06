/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { FeatureCollection } from 'geojson';
import _ from 'lodash';
import { Adapters } from 'src/plugins/inspector/public';
import type { Query } from 'src/plugins/data/common';
import { Filter } from '@kbn/es-query';
import { RasterTileLayer } from '../classes/layers/raster_tile_layer/raster_tile_layer';
import { EmsVectorTileLayer } from '../classes/layers/ems_vector_tile_layer/ems_vector_tile_layer';
import {
  BlendedVectorLayer,
  IVectorLayer,
  MvtVectorLayer,
  GeoJsonVectorLayer,
} from '../classes/layers/vector_layer';
import { VectorStyle } from '../classes/styles/vector/vector_style';
import { HeatmapLayer } from '../classes/layers/heatmap_layer';
import { getTimeFilter } from '../kibana_services';
import {
  getChartsPaletteServiceGetColor,
  getInspectorAdapters,
} from '../reducers/non_serializable_instances';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../reducers/copy_persistent_state';
import { InnerJoin } from '../classes/joins/inner_join';
import { getSourceByType } from '../classes/sources/source_registry';
import { GeoJsonFileSource } from '../classes/sources/geojson_file_source';
import {
  LAYER_TYPE,
  SOURCE_DATA_REQUEST_ID,
  SPATIAL_FILTERS_LAYER_ID,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../common/constants';
// @ts-ignore
import { extractFeaturesFromFilters } from '../../common/elasticsearch_util';
import { MapStoreState } from '../reducers/store';
import {
  AbstractSourceDescriptor,
  DataRequestDescriptor,
  CustomIcon,
  DrawState,
  EditState,
  Goto,
  HeatmapLayerDescriptor,
  LayerDescriptor,
  MapCenter,
  MapExtent,
  TooltipState,
  VectorLayerDescriptor,
} from '../../common/descriptor_types';
import { MapSettings } from '../reducers/map';
import { TimeRange } from '../../../../../src/plugins/data/public';
import { ISource } from '../classes/sources/source';
import { ITMSSource } from '../classes/sources/tms_source';
import { IVectorSource } from '../classes/sources/vector_source';
import { ESGeoGridSource } from '../classes/sources/es_geo_grid_source';
import { EMSTMSSource } from '../classes/sources/ems_tms_source';
import { ILayer } from '../classes/layers/layer';
import { getIsReadOnly } from './ui_selectors';

function createJoinInstances(vectorLayerDescriptor: VectorLayerDescriptor, source: IVectorSource) {
  return vectorLayerDescriptor.joins
    ? vectorLayerDescriptor.joins.map((joinDescriptor) => {
        return new InnerJoin(joinDescriptor, source);
      })
    : [];
}

export function createLayerInstance(
  layerDescriptor: LayerDescriptor,
  customIcons: CustomIcon[],
  inspectorAdapters?: Adapters,
  chartsPaletteServiceGetColor?: (value: string) => string | null
): ILayer {
  const source: ISource = createSourceInstance(layerDescriptor.sourceDescriptor, inspectorAdapters);

  switch (layerDescriptor.type) {
    case LAYER_TYPE.RASTER_TILE:
      return new RasterTileLayer({ layerDescriptor, source: source as ITMSSource });
    case LAYER_TYPE.EMS_VECTOR_TILE:
      return new EmsVectorTileLayer({ layerDescriptor, source: source as EMSTMSSource });
    case LAYER_TYPE.HEATMAP:
      return new HeatmapLayer({
        layerDescriptor: layerDescriptor as HeatmapLayerDescriptor,
        source: source as ESGeoGridSource,
      });
    case LAYER_TYPE.GEOJSON_VECTOR:
      return new GeoJsonVectorLayer({
        layerDescriptor: layerDescriptor as VectorLayerDescriptor,
        source: source as IVectorSource,
        joins: createJoinInstances(
          layerDescriptor as VectorLayerDescriptor,
          source as IVectorSource
        ),
        customIcons,
        chartsPaletteServiceGetColor,
      });
    case LAYER_TYPE.BLENDED_VECTOR:
      return new BlendedVectorLayer({
        layerDescriptor: layerDescriptor as VectorLayerDescriptor,
        source: source as IVectorSource,
        customIcons,
        chartsPaletteServiceGetColor,
      });
    case LAYER_TYPE.MVT_VECTOR:
      return new MvtVectorLayer({
        layerDescriptor: layerDescriptor as VectorLayerDescriptor,
        source: source as IVectorSource,
        joins: createJoinInstances(
          layerDescriptor as VectorLayerDescriptor,
          source as IVectorSource
        ),
        customIcons,
      });
    default:
      throw new Error(`Unrecognized layerType ${layerDescriptor.type}`);
  }
}

function createSourceInstance(
  sourceDescriptor: AbstractSourceDescriptor | null,
  inspectorAdapters?: Adapters
): ISource {
  if (sourceDescriptor === null) {
    throw new Error('Source-descriptor should be initialized');
  }
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

export const getMapExtent = ({ map }: MapStoreState): MapExtent | undefined => map.mapState.extent;

export const getMapBuffer = ({ map }: MapStoreState): MapExtent | undefined => map.mapState.buffer;

export const getMapZoom = ({ map }: MapStoreState): number =>
  map.mapState.zoom ? map.mapState.zoom : 0;

export const getMapCenter = ({ map }: MapStoreState): MapCenter =>
  map.mapState.center ? map.mapState.center : { lat: 0, lon: 0 };

export const getMouseCoordinates = ({ map }: MapStoreState) => map.mapState.mouseCoordinates;

export const getTimeFilters = ({ map }: MapStoreState): TimeRange =>
  map.mapState.timeFilters ? map.mapState.timeFilters : getTimeFilter().getTime();

export const getTimeslice = ({ map }: MapStoreState) => map.mapState.timeslice;

export const getCustomIcons = ({ map }: MapStoreState): CustomIcon[] => {
  return map.settings.customIcons;
};

export const getQuery = ({ map }: MapStoreState): Query | undefined => map.mapState.query;

export const getFilters = ({ map }: MapStoreState): Filter[] => map.mapState.filters;

export const getSearchSessionId = ({ map }: MapStoreState): string | undefined =>
  map.mapState.searchSessionId;

export const getSearchSessionMapBuffer = ({ map }: MapStoreState): MapExtent | undefined =>
  map.mapState.searchSessionMapBuffer;

export const isUsingSearch = (state: MapStoreState): boolean => {
  const filters = getFilters(state).filter((filter) => !filter.meta.disabled);
  const queryString = _.get(getQuery(state), 'query', '');
  return !!filters.length || !!queryString.length;
};

export const getDrawState = ({ map }: MapStoreState): DrawState | undefined =>
  map.mapState.drawState;

export const getEditState = ({ map }: MapStoreState): EditState | undefined =>
  map.mapState.editState;

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
  getTimeslice,
  getQuery,
  getFilters,
  getSearchSessionId,
  getSearchSessionMapBuffer,
  getIsReadOnly,
  (
    mapExtent,
    mapBuffer,
    mapZoom,
    timeFilters,
    timeslice,
    query,
    filters,
    searchSessionId,
    searchSessionMapBuffer,
    isReadOnly
  ) => {
    return {
      extent: mapExtent,
      buffer: searchSessionId && searchSessionMapBuffer ? searchSessionMapBuffer : mapBuffer,
      zoom: mapZoom,
      timeFilters,
      timeslice,
      query,
      filters,
      searchSessionId,
      isReadOnly,
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
    const geoJsonSourceDescriptor = GeoJsonFileSource.createDescriptor({
      __featureCollection: featureCollection,
      name: 'spatialFilters',
    });

    return new GeoJsonVectorLayer({
      layerDescriptor: GeoJsonVectorLayer.createDescriptor({
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
      source: new GeoJsonFileSource(geoJsonSourceDescriptor),
      customIcons: [], // spatial filters layer does not support custom icons
    });
  }
);

export const getLayerList = createSelector(
  getLayerListRaw,
  getInspectorAdapters,
  getChartsPaletteServiceGetColor,
  getCustomIcons,
  (layerDescriptorList, inspectorAdapters, chartsPaletteServiceGetColor, customIcons) => {
    return layerDescriptorList.map((layerDescriptor) =>
      createLayerInstance(
        layerDescriptor,
        customIcons,
        inspectorAdapters,
        chartsPaletteServiceGetColor
      )
    );
  }
);

export const getLayerListConfigOnly = createSelector(getLayerListRaw, (layerDescriptorList) => {
  return copyPersistentState(layerDescriptorList);
});

export function getLayerById(layerId: string | null, state: MapStoreState): ILayer | undefined {
  return getLayerList(state).find((layer) => {
    return layerId === layer.getId();
  });
}

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

  return (selectedLayer as IVectorLayer).getJoins().map((join: InnerJoin) => {
    return join.toDescriptor();
  });
});

export const getQueryableUniqueIndexPatternIds = createSelector(
  getLayerList,
  getWaitingForMapReadyLayerListRaw,
  (layerList, waitingForMapReadyLayerList) => {
    const indexPatternIds: string[] = [];

    if (waitingForMapReadyLayerList.length) {
      waitingForMapReadyLayerList.forEach((layerDescriptor) => {
        const layer = createLayerInstance(layerDescriptor, []); // custom icons not needed, layer instance only used to get index pattern ids
        if (layer.isVisible()) {
          indexPatternIds.push(...layer.getQueryableIndexPatternIds());
        }
      });
    } else {
      layerList.forEach((layer) => {
        if (layer.isVisible()) {
          indexPatternIds.push(...layer.getQueryableIndexPatternIds());
        }
      });
    }
    return _.uniq(indexPatternIds);
  }
);

export const getGeoFieldNames = createSelector(
  getLayerList,
  getWaitingForMapReadyLayerListRaw,
  (layerList, waitingForMapReadyLayerList) => {
    const geoFieldNames: string[] = [];

    if (waitingForMapReadyLayerList.length) {
      waitingForMapReadyLayerList.forEach((layerDescriptor) => {
        const layer = createLayerInstance(layerDescriptor, []); // custom icons not needed, layer instance only used to get geo field names
        geoFieldNames.push(...layer.getGeoFieldNames());
      });
    } else {
      layerList.forEach((layer) => {
        geoFieldNames.push(...layer.getGeoFieldNames());
      });
    }
    return _.uniq(geoFieldNames);
  }
);

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
      if (
        layer.isVisible() &&
        layer.showAtZoomLevel(zoom) &&
        !layer.hasErrors() &&
        !layer.isInitialDataLoadComplete()
      ) {
        return false;
      }
    }
    return true;
  }
);
