/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AnyAction, Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { MapStoreState } from '../reducers/store';
import { SOURCE_DATA_ID_ORIGIN } from '../../common/constants';
import {
  getDataFilters,
  getDataRequestDescriptor,
  getLayerById,
  getLayerList,
} from '../selectors/map_selectors';
import {
  cancelRequest,
  registerCancelCallback,
  unregisterCancelCallback,
  getEventHandlers,
  // @ts-ignore
} from '../reducers/non_serializable_instances';
import { cleanTooltipStateForLayer } from './tooltip_actions';
import {
  LAYER_DATA_LOAD_ENDED,
  LAYER_DATA_LOAD_ERROR,
  LAYER_DATA_LOAD_STARTED,
  SET_LAYER_ERROR_STATUS,
  SET_LAYER_STYLE_META,
  UPDATE_LAYER_PROP,
  UPDATE_SOURCE_DATA_REQUEST,
} from './map_action_constants';
import { ILayer } from '../classes/layers/layer';
import { DataMeta, MapFilters } from '../../common/descriptor_types';

export type DataRequestContext = {
  startLoading(dataId: string, requestToken: symbol, meta: DataMeta): void;
  stopLoading(dataId: string, requestToken: symbol, data: unknown, meta: DataMeta): void;
  onLoadError(dataId: string, requestToken: symbol, errorMessage: string): void;
  updateSourceData(newData: unknown): void;
  isRequestStillActive(dataId: string, requestToken: symbol): boolean;
  registerCancelCallback(requestToken: symbol, callback: () => void): void;
  dataFilters: MapFilters;
};

export function clearDataRequests(layer: ILayer): ThunkAction {
  return dispatch => {
    layer.getInFlightRequestTokens().forEach(requestToken => {
      dispatch(cancelRequest(requestToken));
    });
    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layer.getId(),
      propName: '__dataRequests',
      newValue: [],
    });
  };
}

export function cancelAllInFlightRequests(): AnyAction {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    getLayerList(getState()).forEach(layer => {
      dispatch(clearDataRequests(layer));
    });
  };
}

export function updateStyleMeta(layerId): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }
    const sourceDataRequest = layer.getSourceDataRequest();
    const style = layer.getCurrentStyle();
    if (!style || !sourceDataRequest) {
      return;
    }
    const styleMeta = await style.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
    dispatch({
      type: SET_LAYER_STYLE_META,
      layerId,
      styleMeta,
    });
  };
}

function getDataRequestContext(
  dispatch: Dispatch<AnyAction>,
  getState: () => MapStoreState,
  layerId: string
): DataRequestContext {
  return {
    dataFilters: getDataFilters(getState()),
    startLoading: (dataId, requestToken, meta) =>
      dispatch(startDataLoad(layerId, dataId, requestToken, meta)),
    stopLoading: (dataId, requestToken, data, meta) =>
      dispatch(endDataLoad(layerId, dataId, requestToken, data, meta)),
    onLoadError: (dataId, requestToken, errorMessage) =>
      dispatch(onDataLoadError(layerId, dataId, requestToken, errorMessage)),
    updateSourceData: newData => {
      dispatch(updateSourceDataRequest(layerId, newData));
    },
    isRequestStillActive: (dataId, requestToken) => {
      const dataRequest = getDataRequestDescriptor(getState(), layerId, dataId);
      if (!dataRequest) {
        return false;
      }
      return dataRequest.dataRequestToken === requestToken;
    },
    registerCancelCallback: (requestToken, callback) =>
      dispatch(registerCancelCallback(requestToken, callback)),
  };
}

export function syncDataForAllLayers(): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const syncPromises = getLayerList(getState()).map(async layer => {
      return dispatch(syncDataForLayer(layer));
    });
    await Promise.all(syncPromises);
  };
}

export function syncDataForLayer(layer): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const dataRequestContext = getDataRequestContext(dispatch, getState, layer.getId());
    if (!layer.isVisible() || !layer.showAtZoomLevel(dataRequestContext.dataFilters.zoom)) {
      return;
    }
    await layer.syncData(dataRequestContext);
  };
}

export function syncDataForLayerId(layerId): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layer = getLayerById(layerId, getState());
    if (layer) {
      dispatch(syncDataForLayer(layer));
    }
  };
}

function setLayerDataLoadErrorStatus(layerId, errorMessage): AnyAction {
  return dispatch => {
    dispatch({
      type: SET_LAYER_ERROR_STATUS,
      isInErrorState: errorMessage !== null,
      layerId,
      errorMessage,
    });
  };
}

function startDataLoad(layerId, dataId, requestToken, meta = {}): AnyAction {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layer = getLayerById(layerId, getState());
    if (layer) {
      dispatch(cancelRequest(layer.getPrevRequestToken(dataId)));
    }

    const eventHandlers = getEventHandlers(getState());
    if (eventHandlers && eventHandlers.onDataLoad) {
      eventHandlers.onDataLoad({
        layerId,
        dataId,
      });
    }

    dispatch({
      meta,
      type: LAYER_DATA_LOAD_STARTED,
      layerId,
      dataId,
      requestToken,
    });
  };
}

function endDataLoad(
  layerId: string,
  dataId: string,
  requestToken: symbol,
  data: unknown,
  meta: DataMeta
): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    dispatch(unregisterCancelCallback(requestToken));

    const features = data && data.features ? data.features : [];

    const eventHandlers = getEventHandlers(getState());
    if (eventHandlers && eventHandlers.onDataLoadEnd) {
      const layer = getLayerById(layerId, getState());
      const resultMeta = {};
      if (layer && layer.getType() === LAYER_TYPE.VECTOR) {
        resultMeta.featuresCount = features.length;
      }

      eventHandlers.onDataLoadEnd({
        layerId,
        dataId,
        resultMeta,
      });
    }

    dispatch(cleanTooltipStateForLayer(layerId, features));
    dispatch({
      type: LAYER_DATA_LOAD_ENDED,
      layerId,
      dataId,
      data,
      meta,
      requestToken,
    });

    // Clear any data-load errors when there is a succesful data return.
    // Co this on end-data-load iso at start-data-load to avoid blipping the error status between true/false.
    // This avoids jitter in the warning icon of the TOC when the requests continues to return errors.
    dispatch(setLayerDataLoadErrorStatus(layerId, null));

    dispatch(updateStyleMeta(layerId));
  };
}

function onDataLoadError(layerId, dataId, requestToken, errorMessage): AnyAction {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    dispatch(unregisterCancelCallback(requestToken));

    const eventHandlers = getEventHandlers(getState());
    if (eventHandlers && eventHandlers.onDataLoadError) {
      eventHandlers.onDataLoadError({
        layerId,
        dataId,
        errorMessage,
      });
    }

    dispatch(cleanTooltipStateForLayer(layerId));
    dispatch({
      type: LAYER_DATA_LOAD_ERROR,
      data: null,
      layerId,
      dataId,
      requestToken,
    });

    dispatch(setLayerDataLoadErrorStatus(layerId, errorMessage));
  };
}

export function updateSourceDataRequest(layerId, newData) {
  return dispatch => {
    dispatch({
      type: UPDATE_SOURCE_DATA_REQUEST,
      dataId: SOURCE_DATA_ID_ORIGIN,
      layerId,
      newData,
    });

    dispatch(updateStyleMeta(layerId));
  };
}
