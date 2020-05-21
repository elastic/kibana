/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import {
  getLayerById,
  getLayerListRaw,
  getDataFilters,
  getSelectedLayerId,
  getMapReady,
  getWaitingForMapReadyLayerListRaw,
  getTransientLayerId,
  getQuery,
  getFittableLayers,
} from '../selectors/map_selectors';
import { FLYOUT_STATE } from '../reducers/ui';
import { cancelRequest } from '../reducers/non_serializable_instances';
import { updateFlyout } from './ui_actions';
import {
  ADD_LAYER,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_GOTO,
  CLEAR_MOUSE_COORDINATES,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  DISABLE_TOOLTIP_CONTROL,
  HIDE_LAYER_CONTROL,
  HIDE_TOOLBAR_OVERLAY,
  HIDE_VIEW_CONTROL,
  MAP_DESTROYED,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  REMOVE_LAYER,
  REMOVE_TRACKED_LAYER_STATE,
  ROLLBACK_MAP_SETTINGS,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  SET_GOTO,
  SET_INTERACTIVE,
  SET_JOINS,
  SET_LAYER_VISIBILITY,
  SET_MAP_INIT_ERROR,
  SET_MAP_SETTINGS,
  SET_MOUSE_COORDINATES,
  SET_OPEN_TOOLTIPS,
  SET_QUERY,
  SET_REFRESH_CONFIG,
  SET_SCROLL_ZOOM,
  SET_SELECTED_LAYER,
  SET_TRANSIENT_LAYER,
  SET_WAITING_FOR_READY_HIDDEN_LAYERS,
  TRACK_CURRENT_LAYER_STATE,
  TRACK_MAP_SETTINGS,
  TRIGGER_REFRESH_TIMER,
  UPDATE_DRAW_STATE,
  UPDATE_LAYER_ORDER,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  UPDATE_MAP_SETTING,
  UPDATE_SOURCE_PROP,
} from './map_action_constants';
import {
  clearDataRequests,
  syncDataForAllLayers,
  syncDataForLayerId,
  syncDataForLayer,
  updateStyleMeta,
} from './data_request_actions';
import { cleanTooltipStateForLayer } from './tooltip_actions';

export function setMapInitError(errorMessage) {
  return {
    type: SET_MAP_INIT_ERROR,
    errorMessage,
  };
}

export function setMapSettings(settings) {
  return {
    type: SET_MAP_SETTINGS,
    settings,
  };
}

export function rollbackMapSettings() {
  return { type: ROLLBACK_MAP_SETTINGS };
}

export function trackMapSettings() {
  return { type: TRACK_MAP_SETTINGS };
}

export function updateMapSetting(settingKey, settingValue) {
  return {
    type: UPDATE_MAP_SETTING,
    settingKey,
    settingValue,
  };
}

export function trackCurrentLayerState(layerId) {
  return {
    type: TRACK_CURRENT_LAYER_STATE,
    layerId: layerId,
  };
}

export function rollbackToTrackedLayerStateForSelectedLayer() {
  return async (dispatch, getState) => {
    const layerId = getSelectedLayerId(getState());
    await dispatch({
      type: ROLLBACK_TO_TRACKED_LAYER_STATE,
      layerId: layerId,
    });

    // Ensure updateStyleMeta is triggered
    // syncDataForLayer may not trigger endDataLoad if no re-fetch is required
    dispatch(updateStyleMeta(layerId));

    dispatch(syncDataForLayerId(layerId));
  };
}

export function removeTrackedLayerStateForSelectedLayer() {
  return (dispatch, getState) => {
    const layerId = getSelectedLayerId(getState());
    dispatch({
      type: REMOVE_TRACKED_LAYER_STATE,
      layerId: layerId,
    });
  };
}

export function replaceLayerList(newLayerList) {
  return (dispatch, getState) => {
    const isMapReady = getMapReady(getState());
    if (!isMapReady) {
      dispatch({
        type: CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
      });
    } else {
      getLayerListRaw(getState()).forEach(({ id }) => {
        dispatch(removeLayerFromLayerList(id));
      });
    }

    newLayerList.forEach(layerDescriptor => {
      dispatch(addLayer(layerDescriptor));
    });
  };
}

export function cloneLayer(layerId) {
  return async (dispatch, getState) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }

    const clonedDescriptor = await layer.cloneDescriptor();
    dispatch(addLayer(clonedDescriptor));
  };
}

export function addLayer(layerDescriptor) {
  return (dispatch, getState) => {
    const isMapReady = getMapReady(getState());
    if (!isMapReady) {
      dispatch({
        type: ADD_WAITING_FOR_MAP_READY_LAYER,
        layer: layerDescriptor,
      });
      return;
    }

    dispatch({
      type: ADD_LAYER,
      layer: layerDescriptor,
    });
    dispatch(syncDataForLayerId(layerDescriptor.id));
  };
}

// Do not use when rendering a map. Method exists to enable selectors for getLayerList when
// rendering is not needed.
export function addLayerWithoutDataSync(layerDescriptor) {
  return {
    type: ADD_LAYER,
    layer: layerDescriptor,
  };
}

export function setLayerVisibility(layerId, makeVisible) {
  return async (dispatch, getState) => {
    //if the current-state is invisible, we also want to sync data
    //e.g. if a layer was invisible at start-up, it won't have any data loaded
    const layer = getLayerById(layerId, getState());

    // If the layer visibility is already what we want it to be, do nothing
    if (!layer || layer.isVisible() === makeVisible) {
      return;
    }

    if (!makeVisible) {
      dispatch(cleanTooltipStateForLayer(layerId));
    }

    await dispatch({
      type: SET_LAYER_VISIBILITY,
      layerId,
      visibility: makeVisible,
    });
    if (makeVisible) {
      dispatch(syncDataForLayer(layer));
    }
  };
}

export function toggleLayerVisible(layerId) {
  return async (dispatch, getState) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }
    const makeVisible = !layer.isVisible();

    dispatch(setLayerVisibility(layerId, makeVisible));
  };
}

export function setSelectedLayer(layerId) {
  return async (dispatch, getState) => {
    const oldSelectedLayer = getSelectedLayerId(getState());
    if (oldSelectedLayer) {
      await dispatch(rollbackToTrackedLayerStateForSelectedLayer());
    }
    if (layerId) {
      dispatch(trackCurrentLayerState(layerId));
    }
    dispatch({
      type: SET_SELECTED_LAYER,
      selectedLayerId: layerId,
    });
  };
}

export function removeTransientLayer() {
  return async (dispatch, getState) => {
    const transientLayerId = getTransientLayerId(getState());
    if (transientLayerId) {
      await dispatch(removeLayerFromLayerList(transientLayerId));
      await dispatch(setTransientLayer(null));
    }
  };
}

export function setTransientLayer(layerId) {
  return {
    type: SET_TRANSIENT_LAYER,
    transientLayerId: layerId,
  };
}

export function clearTransientLayerStateAndCloseFlyout() {
  return async dispatch => {
    await dispatch(updateFlyout(FLYOUT_STATE.NONE));
    await dispatch(setSelectedLayer(null));
    await dispatch(removeTransientLayer());
  };
}

export function updateLayerOrder(newLayerOrder) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder,
  };
}

export function mapReady() {
  return (dispatch, getState) => {
    dispatch({
      type: MAP_READY,
    });

    getWaitingForMapReadyLayerListRaw(getState()).forEach(layerDescriptor => {
      dispatch(addLayer(layerDescriptor));
    });

    dispatch({
      type: CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
    });
  };
}

export function mapDestroyed() {
  return {
    type: MAP_DESTROYED,
  };
}

export function mapExtentChanged(newMapConstants) {
  return async (dispatch, getState) => {
    const state = getState();
    const dataFilters = getDataFilters(state);
    const { extent, zoom: newZoom } = newMapConstants;
    const { buffer, zoom: currentZoom } = dataFilters;

    if (extent) {
      let doesBufferContainExtent = false;
      if (buffer) {
        const bufferGeometry = turf.bboxPolygon([
          buffer.minLon,
          buffer.minLat,
          buffer.maxLon,
          buffer.maxLat,
        ]);
        const extentGeometry = turf.bboxPolygon([
          extent.minLon,
          extent.minLat,
          extent.maxLon,
          extent.maxLat,
        ]);

        doesBufferContainExtent = turfBooleanContains(bufferGeometry, extentGeometry);
      }

      if (!doesBufferContainExtent || currentZoom !== newZoom) {
        const scaleFactor = 0.5; // TODO put scale factor in store and fetch with selector
        const width = extent.maxLon - extent.minLon;
        const height = extent.maxLat - extent.minLat;
        dataFilters.buffer = {
          minLon: extent.minLon - width * scaleFactor,
          minLat: extent.minLat - height * scaleFactor,
          maxLon: extent.maxLon + width * scaleFactor,
          maxLat: extent.maxLat + height * scaleFactor,
        };
      }
    }

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapState: {
        ...dataFilters,
        ...newMapConstants,
      },
    });
    await dispatch(syncDataForAllLayers());
  };
}

export function setMouseCoordinates({ lat, lon }) {
  let safeLon = lon;
  if (lon > 180) {
    const overlapWestOfDateLine = lon - 180;
    safeLon = -180 + overlapWestOfDateLine;
  } else if (lon < -180) {
    const overlapEastOfDateLine = Math.abs(lon) - 180;
    safeLon = 180 - overlapEastOfDateLine;
  }

  return {
    type: SET_MOUSE_COORDINATES,
    lat,
    lon: safeLon,
  };
}

export function clearMouseCoordinates() {
  return { type: CLEAR_MOUSE_COORDINATES };
}

export function disableScrollZoom() {
  return { type: SET_SCROLL_ZOOM, scrollZoom: false };
}

export function fitToLayerExtent(layerId) {
  return async function(dispatch, getState) {
    const targetLayer = getLayerById(layerId, getState());

    if (targetLayer) {
      const dataFilters = getDataFilters(getState());
      const bounds = await targetLayer.getBounds(dataFilters);
      if (bounds) {
        await dispatch(setGotoWithBounds(bounds));
      }
    }
  };
}

export function fitToDataBounds() {
  return async function(dispatch, getState) {
    const layerList = getFittableLayers(getState());

    if (!layerList.length) {
      return;
    }

    const dataFilters = getDataFilters(getState());
    const boundsPromises = layerList.map(async layer => {
      return layer.getBounds(dataFilters);
    });

    const bounds = await Promise.all(boundsPromises);
    const corners = [];
    for (let i = 0; i < bounds.length; i++) {
      const b = bounds[i];

      //filter out undefined bounds (uses Infinity due to turf responses)
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
      return;
    }

    const turfUnionBbox = turf.bbox(turf.multiPoint(corners));
    const dataBounds = {
      minLon: turfUnionBbox[0],
      minLat: turfUnionBbox[1],
      maxLon: turfUnionBbox[2],
      maxLat: turfUnionBbox[3],
    };

    dispatch(setGotoWithBounds(dataBounds));
  };
}

export function setGotoWithBounds(bounds) {
  return {
    type: SET_GOTO,
    bounds: bounds,
  };
}

export function setGotoWithCenter({ lat, lon, zoom }) {
  return {
    type: SET_GOTO,
    center: { lat, lon, zoom },
  };
}

export function clearGoto() {
  return { type: CLEAR_GOTO };
}

export function updateSourceProp(layerId, propName, value, newLayerType) {
  return async dispatch => {
    dispatch({
      type: UPDATE_SOURCE_PROP,
      layerId,
      propName,
      value,
    });
    if (newLayerType) {
      dispatch(updateLayerType(layerId, newLayerType));
    }
    await dispatch(clearMissingStyleProperties(layerId));
    dispatch(syncDataForLayerId(layerId));
  };
}

function updateLayerType(layerId, newLayerType) {
  return (dispatch, getState) => {
    const layer = getLayerById(layerId, getState());
    if (!layer || layer.getType() === newLayerType) {
      return;
    }
    dispatch(clearDataRequests(layer));
    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layerId,
      propName: 'type',
      newValue: newLayerType,
    });
  };
}

export function updateLayerLabel(id, newLabel) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'label',
    newValue: newLabel,
  };
}

export function updateLayerMinZoom(id, minZoom) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'minZoom',
    newValue: minZoom,
  };
}

export function updateLayerMaxZoom(id, maxZoom) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'maxZoom',
    newValue: maxZoom,
  };
}

export function updateLayerAlpha(id, alpha) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'alpha',
    newValue: alpha,
  };
}

export function setLayerQuery(id, query) {
  return dispatch => {
    dispatch({
      type: UPDATE_LAYER_PROP,
      id,
      propName: 'query',
      newValue: query,
    });

    dispatch(syncDataForLayerId(id));
  };
}

export function removeSelectedLayer() {
  return (dispatch, getState) => {
    const state = getState();
    const layerId = getSelectedLayerId(state);
    dispatch(removeLayer(layerId));
  };
}

export function removeLayer(layerId) {
  return async (dispatch, getState) => {
    const state = getState();
    const selectedLayerId = getSelectedLayerId(state);
    if (layerId === selectedLayerId) {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      await dispatch(setSelectedLayer(null));
    }
    dispatch(removeLayerFromLayerList(layerId));
  };
}

function removeLayerFromLayerList(layerId) {
  return (dispatch, getState) => {
    const layerGettingRemoved = getLayerById(layerId, getState());
    if (!layerGettingRemoved) {
      return;
    }

    layerGettingRemoved.getInFlightRequestTokens().forEach(requestToken => {
      dispatch(cancelRequest(requestToken));
    });
    dispatch(cleanTooltipStateForLayer(layerId));
    layerGettingRemoved.destroy();
    dispatch({
      type: REMOVE_LAYER,
      id: layerId,
    });
  };
}

export function setQuery({ query, timeFilters, filters = [], refresh = false }) {
  function generateQueryTimestamp() {
    return new Date().toISOString();
  }
  return async (dispatch, getState) => {
    const prevQuery = getQuery(getState());
    const prevTriggeredAt =
      prevQuery && prevQuery.queryLastTriggeredAt
        ? prevQuery.queryLastTriggeredAt
        : generateQueryTimestamp();

    dispatch({
      type: SET_QUERY,
      timeFilters,
      query: {
        ...query,
        // ensure query changes to trigger re-fetch when "Refresh" clicked
        queryLastTriggeredAt: refresh ? generateQueryTimestamp() : prevTriggeredAt,
      },
      filters,
    });

    await dispatch(syncDataForAllLayers());
  };
}

export function setRefreshConfig({ isPaused, interval }) {
  return {
    type: SET_REFRESH_CONFIG,
    isPaused,
    interval,
  };
}

export function triggerRefreshTimer() {
  return async dispatch => {
    dispatch({
      type: TRIGGER_REFRESH_TIMER,
    });

    await dispatch(syncDataForAllLayers());
  };
}

export function clearMissingStyleProperties(layerId) {
  return async (dispatch, getState) => {
    const targetLayer = getLayerById(layerId, getState());
    if (!targetLayer) {
      return;
    }

    const style = targetLayer.getCurrentStyle();
    if (!style) {
      return;
    }

    const nextFields = await targetLayer.getFields(); //take into account all fields, since labels can be driven by any field (source or join)
    const { hasChanges, nextStyleDescriptor } = style.getDescriptorWithMissingStylePropsRemoved(
      nextFields
    );
    if (hasChanges) {
      dispatch(updateLayerStyle(layerId, nextStyleDescriptor));
    }
  };
}

export function updateLayerStyle(layerId, styleDescriptor) {
  return dispatch => {
    dispatch({
      type: UPDATE_LAYER_STYLE,
      layerId,
      style: {
        ...styleDescriptor,
      },
    });

    // Ensure updateStyleMeta is triggered
    // syncDataForLayer may not trigger endDataLoad if no re-fetch is required
    dispatch(updateStyleMeta(layerId));

    // Style update may require re-fetch, for example ES search may need to retrieve field used for dynamic styling
    dispatch(syncDataForLayerId(layerId));
  };
}

export function updateLayerStyleForSelectedLayer(styleDescriptor) {
  return (dispatch, getState) => {
    const selectedLayerId = getSelectedLayerId(getState());
    if (!selectedLayerId) {
      return;
    }
    dispatch(updateLayerStyle(selectedLayerId, styleDescriptor));
  };
}

export function setJoinsForLayer(layer, joins) {
  return async dispatch => {
    await dispatch({
      type: SET_JOINS,
      layer,
      joins,
    });

    await dispatch(clearMissingStyleProperties(layer.getId()));
    dispatch(syncDataForLayerId(layer.getId()));
  };
}

export function updateDrawState(drawState) {
  return dispatch => {
    if (drawState !== null) {
      dispatch({ type: SET_OPEN_TOOLTIPS, openTooltips: [] }); // tooltips just get in the way
    }
    dispatch({
      type: UPDATE_DRAW_STATE,
      drawState: drawState,
    });
  };
}

export function disableInteractive() {
  return { type: SET_INTERACTIVE, disableInteractive: true };
}

export function disableTooltipControl() {
  return { type: DISABLE_TOOLTIP_CONTROL, disableTooltipControl: true };
}

export function hideToolbarOverlay() {
  return { type: HIDE_TOOLBAR_OVERLAY, hideToolbarOverlay: true };
}

export function hideLayerControl() {
  return { type: HIDE_LAYER_CONTROL, hideLayerControl: true };
}
export function hideViewControl() {
  return { type: HIDE_VIEW_CONTROL, hideViewControl: true };
}

export function setHiddenLayers(hiddenLayerIds) {
  return (dispatch, getState) => {
    const isMapReady = getMapReady(getState());

    if (!isMapReady) {
      dispatch({ type: SET_WAITING_FOR_READY_HIDDEN_LAYERS, hiddenLayerIds });
    } else {
      getLayerListRaw(getState()).forEach(layer =>
        dispatch(setLayerVisibility(layer.id, !hiddenLayerIds.includes(layer.id)))
      );
    }
  };
}
