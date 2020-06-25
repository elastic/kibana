/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Dispatch } from 'redux';
// @ts-ignore
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { Filter, Query, TimeRange } from 'src/plugins/data/public';
import { MapStoreState } from '../reducers/store';
import {
  getDataFilters,
  getWaitingForMapReadyLayerListRaw,
  getQuery,
} from '../selectors/map_selectors';
import {
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
  ROLLBACK_MAP_SETTINGS,
  SET_GOTO,
  SET_INTERACTIVE,
  SET_MAP_INIT_ERROR,
  SET_MAP_SETTINGS,
  SET_MOUSE_COORDINATES,
  SET_OPEN_TOOLTIPS,
  SET_QUERY,
  SET_REFRESH_CONFIG,
  SET_SCROLL_ZOOM,
  TRACK_MAP_SETTINGS,
  TRIGGER_REFRESH_TIMER,
  UPDATE_DRAW_STATE,
  UPDATE_MAP_SETTING,
} from './map_action_constants';
import { syncDataForAllLayers } from './data_request_actions';
import { addLayer } from './layer_actions';
import { MapSettings } from '../reducers/map';
import {
  DrawState,
  MapCenterAndZoom,
  MapExtent,
  MapRefreshConfig,
} from '../../common/descriptor_types';

export function setMapInitError(errorMessage: string) {
  return {
    type: SET_MAP_INIT_ERROR,
    errorMessage,
  };
}

export function setMapSettings(settings: MapSettings) {
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

export function updateMapSetting(
  settingKey: string,
  settingValue: string | boolean | number | object
) {
  return {
    type: UPDATE_MAP_SETTING,
    settingKey,
    settingValue,
  };
}

export function mapReady() {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    dispatch({
      type: MAP_READY,
    });

    getWaitingForMapReadyLayerListRaw(getState()).forEach((layerDescriptor) => {
      dispatch<any>(addLayer(layerDescriptor));
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

export function mapExtentChanged(newMapConstants: { zoom: number; extent: MapExtent }) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
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
    await dispatch<any>(syncDataForAllLayers());
  };
}

export function setMouseCoordinates({ lat, lon }: { lat: number; lon: number }) {
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

export function setGotoWithCenter({ lat, lon, zoom }: MapCenterAndZoom) {
  return {
    type: SET_GOTO,
    center: { lat, lon, zoom },
  };
}

export function clearGoto() {
  return { type: CLEAR_GOTO };
}

function generateQueryTimestamp() {
  return new Date().toISOString();
}

export function setQuery({
  query,
  timeFilters,
  filters = [],
  refresh = false,
}: {
  filters: Filter[];
  query?: Query;
  timeFilters?: TimeRange;
  refresh?: boolean;
}) {
  return async (dispatch: Dispatch, getState: () => MapStoreState) => {
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

    await dispatch<any>(syncDataForAllLayers());
  };
}

export function setRefreshConfig({ isPaused, interval }: MapRefreshConfig) {
  return {
    type: SET_REFRESH_CONFIG,
    isPaused,
    interval,
  };
}

export function triggerRefreshTimer() {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: TRIGGER_REFRESH_TIMER,
    });

    await dispatch<any>(syncDataForAllLayers());
  };
}

export function updateDrawState(drawState: DrawState) {
  return (dispatch: Dispatch) => {
    if (drawState !== null) {
      dispatch({ type: SET_OPEN_TOOLTIPS, openTooltips: [] }); // tooltips just get in the way
    }
    dispatch({
      type: UPDATE_DRAW_STATE,
      drawState,
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
