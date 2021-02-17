/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { AnyAction, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBooleanContains from '@turf/boolean-contains';

import { Filter, Query, TimeRange } from 'src/plugins/data/public';
import { MapStoreState } from '../reducers/store';
import {
  getDataFilters,
  getFilters,
  getMapSettings,
  getWaitingForMapReadyLayerListRaw,
  getQuery,
  getTimeFilters,
  getLayerList,
  getSearchSessionId,
  getSearchSessionMapBuffer,
} from '../selectors/map_selectors';
import {
  CLEAR_GOTO,
  CLEAR_MOUSE_COORDINATES,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  MAP_DESTROYED,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  ROLLBACK_MAP_SETTINGS,
  SET_GOTO,
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
import { autoFitToBounds, syncDataForAllLayers } from './data_request_actions';
import { addLayer, addLayerWithoutDataSync } from './layer_actions';
import { MapSettings } from '../reducers/map';
import {
  DrawState,
  MapCenter,
  MapCenterAndZoom,
  MapExtent,
  MapRefreshConfig,
} from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common/constants';
import { scaleBounds } from '../../common/elasticsearch_util';
import { cleanTooltipStateForLayer } from './tooltip_actions';

export interface MapExtentState {
  zoom: number;
  extent: MapExtent;
  center: MapCenter;
}

export function setMapInitError(errorMessage: string) {
  return {
    type: SET_MAP_INIT_ERROR,
    errorMessage,
  };
}

export function setMapSettings(settings: Partial<MapSettings>) {
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
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    dispatch({
      type: MAP_READY,
    });

    const waitingForMapReadyLayerList = getWaitingForMapReadyLayerListRaw(getState());
    dispatch({
      type: CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
    });

    if (getMapSettings(getState()).initialLocation === INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS) {
      waitingForMapReadyLayerList.forEach((layerDescriptor) => {
        dispatch(addLayerWithoutDataSync(layerDescriptor));
      });
      dispatch(autoFitToBounds());
    } else {
      waitingForMapReadyLayerList.forEach((layerDescriptor) => {
        dispatch(addLayer(layerDescriptor));
      });
    }
  };
}

export function mapDestroyed() {
  return {
    type: MAP_DESTROYED,
  };
}

export function mapExtentChanged(mapExtentState: MapExtentState) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const dataFilters = getDataFilters(getState());
    const { extent, zoom: newZoom } = mapExtentState;
    const { buffer, zoom: currentZoom } = dataFilters;

    if (extent) {
      let doesBufferContainExtent = false;
      if (buffer) {
        const bufferGeometry = turfBboxPolygon([
          buffer.minLon,
          buffer.minLat,
          buffer.maxLon,
          buffer.maxLat,
        ]);
        const extentGeometry = turfBboxPolygon([
          extent.minLon,
          extent.minLat,
          extent.maxLon,
          extent.maxLat,
        ]);

        doesBufferContainExtent = turfBooleanContains(bufferGeometry, extentGeometry);
      }

      if (!doesBufferContainExtent || currentZoom !== newZoom) {
        dataFilters.buffer = scaleBounds(extent, 0.5);
      }
    }

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapState: {
        ...dataFilters,
        ...mapExtentState,
      },
    });

    if (currentZoom !== newZoom) {
      getLayerList(getState()).map((layer) => {
        if (!layer.showAtZoomLevel(newZoom)) {
          dispatch(cleanTooltipStateForLayer(layer.getId()));
        }
      });
    }

    await dispatch(syncDataForAllLayers());
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
  forceRefresh = false,
  searchSessionId,
  searchSessionMapBuffer,
}: {
  filters?: Filter[];
  query?: Query;
  timeFilters?: TimeRange;
  forceRefresh?: boolean;
  searchSessionId?: string;
  searchSessionMapBuffer?: MapExtent;
}) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const prevQuery = getQuery(getState());
    const prevTriggeredAt =
      prevQuery && prevQuery.queryLastTriggeredAt
        ? prevQuery.queryLastTriggeredAt
        : generateQueryTimestamp();

    const nextQueryContext = {
      timeFilters: timeFilters ? timeFilters : getTimeFilters(getState()),
      query: {
        ...(query ? query : getQuery(getState())),
        // ensure query changes to trigger re-fetch when "Refresh" clicked
        queryLastTriggeredAt: forceRefresh ? generateQueryTimestamp() : prevTriggeredAt,
      },
      filters: filters ? filters : getFilters(getState()),
      searchSessionId,
      searchSessionMapBuffer,
    };

    const prevQueryContext = {
      timeFilters: getTimeFilters(getState()),
      query: getQuery(getState()),
      filters: getFilters(getState()),
      searchSessionId: getSearchSessionId(getState()),
      searchSessionMapBuffer: getSearchSessionMapBuffer(getState()),
    };

    if (_.isEqual(nextQueryContext, prevQueryContext)) {
      // do nothing if query context has not changed
      return;
    }

    dispatch({
      type: SET_QUERY,
      ...nextQueryContext,
    });

    if (getMapSettings(getState()).autoFitToDataBounds) {
      dispatch(autoFitToBounds());
    } else {
      await dispatch(syncDataForAllLayers());
    }
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
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    dispatch({
      type: TRIGGER_REFRESH_TIMER,
    });

    if (getMapSettings(getState()).autoFitToDataBounds) {
      dispatch(autoFitToBounds());
    } else {
      await dispatch(syncDataForAllLayers());
    }
  };
}

export function updateDrawState(drawState: DrawState | null) {
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
