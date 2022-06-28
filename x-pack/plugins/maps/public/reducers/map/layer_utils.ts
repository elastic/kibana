/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import {
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../../common/descriptor_types';
import { MapState } from './types';
import { getUsageCollection } from '../../kibana_services';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../copy_persistent_state';
import {
  APP_ID,
  SOURCE_TYPES,
  GRID_RESOLUTION,
  RENDER_AS,
  SCALING_TYPES,
} from '../../../common/constants';

export function getLayerIndex(list: LayerDescriptor[], layerId: string): number {
  return list.findIndex(({ id }) => layerId === id);
}

export function findLayerById(state: MapState, layerId: string): LayerDescriptor | undefined {
  return state.layerList.find(({ id }) => layerId === id);
}

export function clearLayerProp(
  state: MapState,
  layerId: string,
  propName: keyof LayerDescriptor
): MapState {
  if (!layerId) {
    return state;
  }

  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  if (layerIdx === -1) {
    return state;
  }

  const updatedLayer = {
    ...layerList[layerIdx],
  };
  delete updatedLayer[propName];
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ];
  return { ...state, layerList: updatedList };
}

export function updateLayerInList(
  state: MapState,
  layerId: string,
  attribute: keyof LayerDescriptor,
  newValue?: unknown
): MapState {
  if (!layerId) {
    return state;
  }

  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  if (layerIdx === -1) {
    return state;
  }

  const updatedLayer = {
    ...layerList[layerIdx],
    // Update layer w/ new value. If no value provided, toggle boolean value
    // allow empty strings, 0-value
    [attribute]:
      newValue || newValue === '' || newValue === 0
        ? newValue
        : !(layerList[layerIdx][attribute] as boolean),
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ];
  return { ...state, layerList: updatedList };
}

export function updateLayerSourceDescriptorProp(
  state: MapState,
  layerId: string,
  propName: string,
  value: unknown
): MapState {
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  const updatedLayer = {
    ...layerList[layerIdx],
    sourceDescriptor: {
      ...layerList[layerIdx].sourceDescriptor,
      [propName]: value,
    },
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ] as LayerDescriptor[];
  return { ...state, layerList: updatedList };
}

export function trackCurrentLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  const layerCopy = copyPersistentState(layer);
  return updateLayerInList(state, layerId, TRACKED_LAYER_DESCRIPTOR, layerCopy);
}

export function removeTrackedLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }

  const copyLayer = { ...layer };
  delete copyLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: setLayer(state.layerList, copyLayer),
  };
}

export function rollbackTrackedLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }

  const trackedLayerDescriptor = layer[TRACKED_LAYER_DESCRIPTOR];

  // this assumes that any nested temp-state in the layer-descriptor (e.g. of styles), is not relevant and can be recovered easily (e.g. this is not the case for __dataRequests)
  // That assumption is true in the context of this app, but not generalizable.
  // consider rewriting copyPersistentState to only strip the first level of temp state.
  const rolledbackLayer = { ...layer, ...trackedLayerDescriptor };
  delete rolledbackLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: setLayer(state.layerList, rolledbackLayer),
  };
}

export function setLayer(
  layerList: LayerDescriptor[],
  layerDescriptor: LayerDescriptor
): LayerDescriptor[] {
  const layerIndex = getLayerIndex(layerList, layerDescriptor.id);
  if (layerIndex === -1) {
    return layerList;
  }
  const newLayerList = [...layerList];
  newLayerList[layerIndex] = layerDescriptor;
  return newLayerList;
}

export function incrementLayerUsage(layerList: LayerDescriptor[]): void {
  const usageCollector = getUsageCollection();
  if (!usageCollector) {
    return;
  }

  for (const layer of layerList) {
    const { sourceDescriptor } = layer;
    switch (sourceDescriptor?.type) {
      case undefined:
        break;
      case SOURCE_TYPES.ES_GEO_GRID: {
        const { resolution, requestType } = sourceDescriptor as ESGeoGridSourceDescriptor;
        let agg;
        const resolutionType = GRID_RESOLUTION[resolution].toLowerCase();
        if (requestType === RENDER_AS.POINT) {
          agg = 'clusters';
        } else if (requestType === RENDER_AS.GRID) {
          agg = 'grids';
        } else if (requestType === RENDER_AS.HEX) {
          agg = 'hexagons';
        } else if (requestType === RENDER_AS.HEATMAP) {
          agg = 'heatmap';
        } else return;
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, [
          `view_layer_es_agg_${agg}`,
          `resolution_${resolutionType}`,
        ]);
        break;
      }
      case SOURCE_TYPES.ES_SEARCH: {
        const { scalingType } = sourceDescriptor as ESSearchSourceDescriptor;
        let scaling;
        let layer = 'es_docs';
        if (scalingType === SCALING_TYPES.LIMIT) {
          scaling = 'limit';
        } else if (scalingType === SCALING_TYPES.CLUSTERS) {
          scaling = 'clusters';
        } else if (scalingType === SCALING_TYPES.MVT) {
          scaling = 'mvt';
        } else if (scalingType === SCALING_TYPES.TOP_HITS) {
          // Count top hits layer separately from documents
          layer = 'es_top_hits';
          scaling = 'top_hits';
        // TODO machine learning anomalies layer
        } else return;
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, [
          `view_layer_${layer}`,
          `scaling_${scaling}`,
        ]);
        break;
      }
      case SOURCE_TYPES.ES_PEW_PEW: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_es_point_to_point`);
        break;
      }
      case SOURCE_TYPES.ES_GEO_LINE: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_es_tracks`);
        break;
      }
      case SOURCE_TYPES.EMS_TMS: {
        let emsLayer;
        const { isAutoSelect, id } = sourceDescriptor as EMSTMSSourceDescriptor;
        if (isAutoSelect) {
          emsLayer = 'auto';
        } else if (id === 'dark_map') {
          emsLayer = 'dark';
        } else if (id === 'road_map_desaturated') {
          emsLayer = 'roadmap_desaturated';
        } else if (id === 'road_map') {
          emsLayer = 'roadmap';
        } else return;
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, [
          `view_layer_ems_basemap`,
          `ems_basemap_${emsLayer}`,
        ]);
        break;
      }
      case SOURCE_TYPES.EMS_FILE: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_ems_region`);
        break;
      }
      case SOURCE_TYPES.KIBANA_TILEMAP: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_kbn_tms_raster`);
        break;
      }
      case SOURCE_TYPES.WMS: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_wms`);
        break;
      }
      case SOURCE_TYPES.EMS_XYZ: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_tms_raster`);
        break;
      }
      case SOURCE_TYPES.MVT_SINGLE_LAYER: {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_tms_mvt`);
        break;
      }
      // TODO Can we import the ML_ANOMALY const from @kbn/ml-plugin?
      case 'ML_ANOMALIES': {
        usageCollector.reportUiCounter(APP_ID, METRIC_TYPE.LOADED, `view_layer_ml_anomalies`);
      }
      default:
        break;
    }
  }
}
