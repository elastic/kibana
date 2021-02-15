/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AnyAction, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import bbox from '@turf/bbox';
import uuid from 'uuid/v4';
import { multiPoint } from '@turf/helpers';
import { FeatureCollection } from 'geojson';
import { MapStoreState } from '../reducers/store';
import { LAYER_STYLE_TYPE, LAYER_TYPE, SOURCE_DATA_REQUEST_ID } from '../../common/constants';
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
  ResultMeta,
} from '../reducers/non_serializable_instances';
import { cleanTooltipStateForLayer } from './tooltip_actions';
import {
  LAYER_DATA_LOAD_ENDED,
  LAYER_DATA_LOAD_ERROR,
  LAYER_DATA_LOAD_STARTED,
  SET_GOTO,
  SET_LAYER_ERROR_STATUS,
  SET_LAYER_STYLE_META,
  UPDATE_LAYER_PROP,
  UPDATE_SOURCE_DATA_REQUEST,
} from './map_action_constants';
import { ILayer } from '../classes/layers/layer';
import { IVectorLayer } from '../classes/layers/vector_layer';
import { DataMeta, MapExtent, MapFilters } from '../../common/descriptor_types';
import { DataRequestAbortError } from '../classes/util/data_request';
import { scaleBounds, turfBboxToBounds } from '../../common/elasticsearch_util';
import { IVectorStyle } from '../classes/styles/vector/vector_style';

const FIT_TO_BOUNDS_SCALE_FACTOR = 0.1;

export type DataRequestContext = {
  startLoading(dataId: string, requestToken: symbol, requestMeta: DataMeta): void;
  stopLoading(dataId: string, requestToken: symbol, data: object, resultsMeta?: DataMeta): void;
  onLoadError(dataId: string, requestToken: symbol, errorMessage: string): void;
  updateSourceData(newData: unknown): void;
  isRequestStillActive(dataId: string, requestToken: symbol): boolean;
  registerCancelCallback(requestToken: symbol, callback: () => void): void;
  dataFilters: MapFilters;
};

export function clearDataRequests(layer: ILayer) {
  return (dispatch: Dispatch) => {
    layer.getInFlightRequestTokens().forEach((requestToken: symbol) => {
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

export function cancelAllInFlightRequests() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    getLayerList(getState()).forEach((layer) => {
      dispatch(clearDataRequests(layer));
    });
  };
}

export function updateStyleMeta(layerId: string | null) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }
    const sourceDataRequest = layer.getSourceDataRequest();
    const style = layer.getCurrentStyle();
    if (!style || !sourceDataRequest || style.getType() !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }
    const styleMeta = await (style as IVectorStyle).pluckStyleMetaFromSourceDataRequest(
      sourceDataRequest
    );
    dispatch({
      type: SET_LAYER_STYLE_META,
      layerId,
      styleMeta,
    });
  };
}

function getDataRequestContext(
  dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
  getState: () => MapStoreState,
  layerId: string
): DataRequestContext {
  return {
    dataFilters: getDataFilters(getState()),
    startLoading: (dataId: string, requestToken: symbol, meta: DataMeta) =>
      dispatch(startDataLoad(layerId, dataId, requestToken, meta)),
    stopLoading: (dataId: string, requestToken: symbol, data: object, meta: DataMeta) =>
      dispatch(endDataLoad(layerId, dataId, requestToken, data, meta)),
    onLoadError: (dataId: string, requestToken: symbol, errorMessage: string) =>
      dispatch(onDataLoadError(layerId, dataId, requestToken, errorMessage)),
    updateSourceData: (newData: unknown) => {
      dispatch(updateSourceDataRequest(layerId, newData));
    },
    isRequestStillActive: (dataId: string, requestToken: symbol) => {
      const dataRequest = getDataRequestDescriptor(getState(), layerId, dataId);
      if (!dataRequest) {
        return false;
      }
      return dataRequest.dataRequestToken === requestToken;
    },
    registerCancelCallback: (requestToken: symbol, callback: () => void) =>
      dispatch(registerCancelCallback(requestToken, callback)),
  };
}

export function syncDataForAllLayers() {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const syncPromises = getLayerList(getState()).map((layer) => {
      return dispatch(syncDataForLayer(layer));
    });
    await Promise.all(syncPromises);
  };
}

function syncDataForAllJoinLayers() {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const syncPromises = getLayerList(getState())
      .filter((layer) => {
        return 'hasJoins' in layer ? (layer as IVectorLayer).hasJoins() : false;
      })
      .map((layer) => {
        return dispatch(syncDataForLayer(layer));
      });
    await Promise.all(syncPromises);
  };
}

export function syncDataForLayer(layer: ILayer) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const dataRequestContext = getDataRequestContext(dispatch, getState, layer.getId());
    if (!layer.isVisible() || !layer.showAtZoomLevel(dataRequestContext.dataFilters.zoom)) {
      return;
    }
    await layer.syncData(dataRequestContext);
  };
}

export function syncDataForLayerId(layerId: string | null) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (layer) {
      dispatch(syncDataForLayer(layer));
    }
  };
}

function setLayerDataLoadErrorStatus(layerId: string, errorMessage: string | null) {
  return (dispatch: Dispatch) => {
    dispatch({
      type: SET_LAYER_ERROR_STATUS,
      isInErrorState: errorMessage !== null,
      layerId,
      errorMessage,
    });
  };
}

function startDataLoad(layerId: string, dataId: string, requestToken: symbol, meta: DataMeta) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
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
  data: object,
  meta: DataMeta
) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    dispatch(unregisterCancelCallback(requestToken));
    const dataRequest = getDataRequestDescriptor(getState(), layerId, dataId);
    if (dataRequest && dataRequest.dataRequestToken !== requestToken) {
      throw new DataRequestAbortError();
    }

    const features = data && 'features' in data ? (data as FeatureCollection).features : [];

    const eventHandlers = getEventHandlers(getState());
    if (eventHandlers && eventHandlers.onDataLoadEnd) {
      const layer = getLayerById(layerId, getState());
      const resultMeta: ResultMeta = {};
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

function onDataLoadError(
  layerId: string,
  dataId: string,
  requestToken: symbol,
  errorMessage: string
) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
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

export function updateSourceDataRequest(layerId: string, newData: unknown) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: UPDATE_SOURCE_DATA_REQUEST,
      dataId: SOURCE_DATA_REQUEST_ID,
      layerId,
      newData,
    });

    dispatch(updateStyleMeta(layerId));
  };
}

export function fitToLayerExtent(layerId: string) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const targetLayer = getLayerById(layerId, getState());

    if (targetLayer) {
      try {
        const bounds = await targetLayer.getBounds(
          getDataRequestContext(dispatch, getState, layerId)
        );
        if (bounds) {
          await dispatch(setGotoWithBounds(scaleBounds(bounds, FIT_TO_BOUNDS_SCALE_FACTOR)));
        }
      } catch (error) {
        if (!(error instanceof DataRequestAbortError)) {
          // eslint-disable-next-line no-console
          console.warn(
            'Unhandled getBounds error for layer. Only DataRequestAbortError should be surfaced',
            error
          );
        }
        // new fitToLayerExtent request has superseded this thread of execution. Results no longer needed.
        return;
      }
    }
  };
}

export function fitToDataBounds(onNoBounds?: () => void) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layerList = getLayerList(getState());

    if (!layerList.length) {
      return;
    }

    const boundsPromises = layerList.map(async (layer: ILayer) => {
      if (!(await layer.isFittable())) {
        return null;
      }
      return layer.getBounds(getDataRequestContext(dispatch, getState, layer.getId()));
    });

    let bounds;
    try {
      bounds = await Promise.all(boundsPromises);
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        // eslint-disable-next-line no-console
        console.warn(
          'Unhandled getBounds error for layer. Only DataRequestAbortError should be surfaced',
          error
        );
      }
      // new fitToDataBounds request has superseded this thread of execution. Results no longer needed.
      return;
    }

    const corners = [];
    for (let i = 0; i < bounds.length; i++) {
      const b = bounds[i];

      // filter out undefined bounds (uses Infinity due to turf responses)
      if (
        b === null ||
        b.minLon === Infinity ||
        b.maxLon === Infinity ||
        b.minLat === -Infinity ||
        b.maxLat === -Infinity
      ) {
        continue;
      }

      corners.push([b.minLon, b.minLat]);
      corners.push([b.maxLon, b.maxLat]);
    }

    if (!corners.length) {
      if (onNoBounds) {
        onNoBounds();
      }
      return;
    }

    const dataBounds = turfBboxToBounds(bbox(multiPoint(corners)));

    dispatch(setGotoWithBounds(scaleBounds(dataBounds, FIT_TO_BOUNDS_SCALE_FACTOR)));
  };
}

let lastSetQueryCallId: string = '';
export function autoFitToBounds() {
  return async (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    // Method can be triggered before async actions complete
    // Use localSetQueryCallId to only continue execution path if method has not been re-triggered.
    const localSetQueryCallId = uuid();
    lastSetQueryCallId = localSetQueryCallId;

    // Joins are performed on the client.
    // As a result, bounds for join layers must also be performed on the client.
    // Therefore join layers need to fetch data prior to auto fitting bounds.
    await dispatch(syncDataForAllJoinLayers());

    if (localSetQueryCallId === lastSetQueryCallId) {
      // In cases where there are no bounds, such as no matching documents, fitToDataBounds does not trigger setGotoWithBounds.
      // Ensure layer syncing occurs when setGotoWithBounds is not triggered.
      function onNoBounds() {
        if (localSetQueryCallId === lastSetQueryCallId) {
          dispatch(syncDataForAllLayers());
        }
      }
      dispatch(fitToDataBounds(onNoBounds));
    }
  };
}

function setGotoWithBounds(bounds: MapExtent) {
  return {
    type: SET_GOTO,
    bounds,
  };
}
