/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { AnyAction, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBooleanContains from '@turf/boolean-contains';
import { Filter } from '@kbn/es-query';
import { Query, TimeRange } from 'src/plugins/data/public';
import { Geometry, Position } from 'geojson';
import { DRAW_MODE, DRAW_SHAPE, LAYER_STYLE_TYPE } from '../../common/constants';
import type { MapExtentState, MapViewContext } from '../reducers/map/types';
import { MapStoreState } from '../reducers/store';
import { IVectorStyle } from '../classes/styles/vector/vector_style';
import {
  getDataFilters,
  getFilters,
  getMapSettings,
  getWaitingForMapReadyLayerListRaw,
  getQuery,
  getTimeFilters,
  getTimeslice,
  getLayerList,
  getSearchSessionId,
  getSearchSessionMapBuffer,
  getLayerById,
  getEditState,
  getSelectedLayerId,
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
  SET_SCROLL_ZOOM,
  TRACK_MAP_SETTINGS,
  UPDATE_DRAW_STATE,
  UPDATE_MAP_SETTING,
  UPDATE_EDIT_STATE,
} from './map_action_constants';
import {
  autoFitToBounds,
  syncDataForAllLayers,
  syncDataForLayerDueToDrawing,
} from './data_request_actions';
import { addLayer, addLayerWithoutDataSync } from './layer_actions';
import { MapSettings } from '../reducers/map';
import { DrawState, MapCenterAndZoom, MapExtent, Timeslice } from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common/constants';
import { updateTooltipStateForLayer } from './tooltip_actions';
import { isVectorLayer, IVectorLayer } from '../classes/layers/vector_layer';
import { SET_DRAW_MODE } from './ui_actions';
import { expandToTileBoundaries } from '../classes/util/geo_tile_utils';
import { getToasts } from '../kibana_services';

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
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: UPDATE_MAP_SETTING,
      settingKey,
      settingValue,
    });

    if (settingKey === 'autoFitToDataBounds' && settingValue === true) {
      dispatch(autoFitToBounds());
    }
  };
}

export function deleteCustomIcon(value: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layerList = getLayerList(getState());
    const findCustomIcons = layerList
      .filter((layer) => {
        const style = layer.getCurrentStyle();
        if (!style || style.getType() !== LAYER_STYLE_TYPE.VECTOR) {
          return;
        }
        return (style as IVectorStyle).getCustomIconIdsInUse().includes(value);
      })
      .map(async (layer) => await layer.getDisplayName());

    const layersContainingCustomIcon = await Promise.all(findCustomIcons);

    if (layersContainingCustomIcon.length > 0) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.mapActions.deleteCustomIconWarning', {
          defaultMessage: `Unable to delete custom icon. This icon is in use by the following layer(s): {layers}`,
          values: {
            layers: layersContainingCustomIcon.join(', '),
          },
        })
      );
    } else {
      const newIcons = getState().map.settings.customIcons.filter(
        ({ symbolId }) => symbolId !== value
      );
      dispatch(updateMapSetting('customIcons', newIcons));
    }
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
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const { extent, zoom: nextZoom } = mapExtentState;
    const { buffer: prevBuffer, zoom: prevZoom } = getDataFilters(getState());

    let doesPrevBufferContainNextExtent = true;
    if (prevBuffer) {
      const bufferGeometry = turfBboxPolygon([
        prevBuffer.minLon,
        prevBuffer.minLat,
        prevBuffer.maxLon,
        prevBuffer.maxLat,
      ]);
      const extentGeometry = turfBboxPolygon([
        extent.minLon,
        extent.minLat,
        extent.maxLon,
        extent.maxLat,
      ]);
      doesPrevBufferContainNextExtent = turfBooleanContains(bufferGeometry, extentGeometry);
    }

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapViewContext: {
        ...mapExtentState,
        buffer:
          !prevBuffer || !doesPrevBufferContainNextExtent || prevZoom !== nextZoom
            ? expandToTileBoundaries(extent, Math.ceil(nextZoom))
            : prevBuffer,
      } as MapViewContext,
    });

    if (prevZoom !== nextZoom) {
      getLayerList(getState()).map((layer) => {
        if (!layer.showAtZoomLevel(nextZoom)) {
          dispatch(updateTooltipStateForLayer(layer));
        }
      });
    }

    dispatch(syncDataForAllLayers(false));
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

export function setQuery({
  query,
  timeFilters,
  timeslice,
  filters,
  forceRefresh = false,
  searchSessionId,
  searchSessionMapBuffer,
  clearTimeslice,
}: {
  filters?: Filter[];
  query?: Query;
  timeFilters?: TimeRange;
  timeslice?: Timeslice;
  forceRefresh?: boolean;
  searchSessionId?: string;
  searchSessionMapBuffer?: MapExtent;
  clearTimeslice?: boolean;
}) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const prevQuery = getQuery(getState());
    const prevTimeFilters = getTimeFilters(getState());

    function getNextTimeslice() {
      if (
        clearTimeslice ||
        (timeFilters !== undefined && !_.isEqual(timeFilters, prevTimeFilters))
      ) {
        return undefined;
      }

      return timeslice ? timeslice : getTimeslice(getState());
    }

    const nextQueryContext = {
      timeFilters: timeFilters ? timeFilters : prevTimeFilters,
      timeslice: getNextTimeslice(),
      query: query ? query : prevQuery,
      filters: filters ? filters : getFilters(getState()),
      searchSessionId: searchSessionId ? searchSessionId : getSearchSessionId(getState()),
      searchSessionMapBuffer,
    };

    const prevQueryContext = {
      timeFilters: prevTimeFilters,
      timeslice: getTimeslice(getState()),
      query: prevQuery,
      filters: getFilters(getState()),
      searchSessionId: getSearchSessionId(getState()),
      searchSessionMapBuffer: getSearchSessionMapBuffer(getState()),
    };

    if (!forceRefresh && _.isEqual(nextQueryContext, prevQueryContext)) {
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
      await dispatch(syncDataForAllLayers(forceRefresh));
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

export function updateEditShape(shapeToDraw: DRAW_SHAPE | null) {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    const editState = getEditState(getState());
    if (!editState) {
      return;
    }
    dispatch({
      type: UPDATE_EDIT_STATE,
      editState: {
        ...editState,
        drawShape: shapeToDraw,
      },
    });
  };
}

export function setEditLayerToSelectedLayer() {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layerId = getSelectedLayerId(getState());
    if (!layerId) {
      return;
    }
    dispatch(updateEditLayer(layerId));
  };
}

export function updateEditLayer(layerId: string | null) {
  return (dispatch: Dispatch) => {
    if (layerId !== null) {
      dispatch({ type: SET_OPEN_TOOLTIPS, openTooltips: [] });
    }
    dispatch({
      type: SET_DRAW_MODE,
      drawMode: DRAW_MODE.NONE,
    });
    dispatch({
      type: UPDATE_EDIT_STATE,
      editState: layerId ? { layerId } : undefined,
    });
  };
}

export function addNewFeatureToIndex(geometry: Geometry | Position[]) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const editState = getEditState(getState());
    const layerId = editState ? editState.layerId : undefined;
    if (!layerId) {
      return;
    }
    const layer = getLayerById(layerId, getState());
    if (!layer || !isVectorLayer(layer)) {
      return;
    }

    try {
      await (layer as IVectorLayer).addFeature(geometry);
      await dispatch(syncDataForLayerDueToDrawing(layer));
    } catch (e) {
      getToasts().addError(e, {
        title: i18n.translate('xpack.maps.mapActions.addFeatureError', {
          defaultMessage: `Unable to add feature to index.`,
        }),
      });
    }
  };
}

export function deleteFeatureFromIndex(featureId: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const editState = getEditState(getState());
    const layerId = editState ? editState.layerId : undefined;
    if (!layerId) {
      return;
    }
    const layer = getLayerById(layerId, getState());
    if (!layer || !isVectorLayer(layer)) {
      return;
    }
    try {
      await (layer as IVectorLayer).deleteFeature(featureId);
      await dispatch(syncDataForLayerDueToDrawing(layer));
    } catch (e) {
      getToasts().addError(e, {
        title: i18n.translate('xpack.maps.mapActions.removeFeatureError', {
          defaultMessage: `Unable to remove feature from index.`,
        }),
      });
    }
  };
}
