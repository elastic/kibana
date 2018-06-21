/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADD_LAYER = 'ADD_LAYER';
export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const LAYER_TYPE = {
  VECTOR_FILE: 'VECTOR_FILE',
  TMS: 'TMS'
};
export const LAYER_SOURCE = {
  EMS: 'EMS',
  WMS: 'WMS',
  TMS: 'TMS',
  CONFIG: 'CONFIG',
  INDEX_PATTERN: 'INDEX_PATTERN',
  SAVED_SEARCH: 'SAVED_SEARCH'
};

const addLayer = (appData, details) => {
  const {
    source,
    layerType,
    visible,
    style
  } = appData;

  return {
    type: ADD_LAYER,
    layer: {
      appData: {
        source,
        layerType,
        visible: visible || true,
        style: style || {}
      },
      details
    }
  };
};

// TODO: Determine standard format for service/file descriptors
export async function loadMapResources(serviceSettings, dispatch) {
  // Hard-coded associated values
  const tmsServices = await serviceSettings.getTMSServices();
  const tmsService = {
    type: LAYER_TYPE.TMS,
    source: LAYER_SOURCE.EMS,
    serviceId: 'road_map',
    service: tmsServices
  };
  const mapServices = [
    tmsService
  ];
  dispatch(fetchServiceLayers(mapServices));
}

export function fetchServiceLayers(services = []) {
  return dispatch => {
    services.forEach(service => {
      switch(service.type) {
        case LAYER_TYPE.TMS:
          dispatch(addTmsService(service));
          break;
        default:
          break;
      }
    });
  };
}

function addTmsService(tms) {
  return addLayer({
    source: tms.source,
    layerType: tms.type
  },
  tms);
}

export function setSelectedLayer(layer) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayer: layer
  };
}

