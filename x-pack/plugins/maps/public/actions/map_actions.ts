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
import type { Query, TimeRange } from '@kbn/es-query';
import { Geometry, Position } from 'geojson';
import { asyncForEach, asyncMap } from '@kbn/std';
import { DRAW_MODE, DRAW_SHAPE, LAYER_STYLE_TYPE } from '../../common/constants';
import type { MapExtentState, MapViewContext } from '../reducers/map/types';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
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
  SET_EMBEDDABLE_SEARCH_CONTEXT,
  SET_GOTO,
  SET_MAP_INIT_ERROR,
  SET_MAP_SETTINGS,
  SET_MOUSE_COORDINATES,
  SET_OPEN_TOOLTIPS,
  SET_QUERY,
  TRACK_MAP_SETTINGS,
  UPDATE_DRAW_STATE,
  UPDATE_MAP_SETTING,
  UPDATE_EDIT_STATE,
} from './map_action_constants';
import {
  autoFitToBounds,
  syncDataForAllLayers,
  syncDataForLayerDueToDrawing,
  syncDataForLayerId,
} from './data_request_actions';
import { addLayer, addLayerWithoutDataSync } from './layer_actions';
import {
  CustomIcon,
  DrawState,
  MapCenterAndZoom,
  MapExtent,
  MapSettings,
  Timeslice,
} from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common/constants';
import { isVectorLayer, IVectorLayer } from '../classes/layers/vector_layer';
import { SET_DRAW_MODE, pushDeletedFeatureId, clearDeletedFeatureIds } from './ui_actions';
import { expandToTileBoundaries, getTilesForExtent } from '../classes/util/geo_tile_utils';
import { getToasts } from '../kibana_services';
import { getDeletedFeatureIds } from '../selectors/ui_selectors';

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

export function updateCustomIcons(customIcons: CustomIcon[]) {
  return {
    type: UPDATE_MAP_SETTING,
    settingKey: 'customIcons',
    settingValue: customIcons,
  };
}

export function deleteCustomIcon(value: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layersContainingCustomIcon = getLayerList(getState()).filter((layer) => {
      const style = layer.getCurrentStyle();
      if (!style || style.getType() !== LAYER_STYLE_TYPE.VECTOR) {
        return false;
      }
      return (style as IVectorStyle).isUsingCustomIcon(value);
    });

    if (layersContainingCustomIcon.length > 0) {
      const layerList = await asyncMap(layersContainingCustomIcon, async (layer) => {
        return await layer.getDisplayName();
      });
      getToasts().addWarning(
        i18n.translate('xpack.maps.mapActions.deleteCustomIconWarning', {
          defaultMessage: `Unable to delete icon. The icon is in use by the {count, plural, one {layer} other {layers}}: {layerNames}`,
          values: {
            count: layerList.length,
            layerNames: layerList.join(', '),
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

    const requiresNewBuffer =
      !prevBuffer || !doesPrevBufferContainNextExtent || prevZoom !== nextZoom;
    if (requiresNewBuffer) {
      getInspectorAdapters(getState()).vectorTiles.setTiles(getTilesForExtent(nextZoom, extent));
    }
    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapViewContext: {
        ...mapExtentState,
        buffer: requiresNewBuffer
          ? expandToTileBoundaries(extent, Math.ceil(nextZoom))
          : prevBuffer,
      } as MapViewContext,
    });

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

export function setEmbeddableSearchContext({
  query,
  filters,
}: {
  filters: Filter[];
  query?: Query;
}) {
  return {
    type: SET_EMBEDDABLE_SEARCH_CONTEXT,
    embeddableSearchContext: { filters, query },
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

    if (shapeToDraw !== DRAW_SHAPE.DELETE) {
      dispatch(clearDeletedFeatureIds());
    }
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
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
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
    dispatch(syncDataForLayerId(layerId, false));
  };
}

export function addNewFeatureToIndex(geometries: Array<Geometry | Position[]>) {
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
      dispatch(updateEditShape(DRAW_SHAPE.WAIT));
      await asyncForEach(geometries, async (geometry) => {
        await (layer as IVectorLayer).addFeature(geometry);
      });
      await dispatch(syncDataForLayerDueToDrawing(layer));
    } catch (e) {
      getToasts().addError(e, {
        title: i18n.translate('xpack.maps.mapActions.addFeatureError', {
          defaultMessage: `Unable to add feature to index.`,
        }),
      });
    }
    dispatch(updateEditShape(DRAW_SHAPE.SIMPLE_SELECT));
  };
}

export function deleteFeatureFromIndex(featureId: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    // There is a race condition where users can click on a previously deleted feature before layer has re-rendered after feature delete.
    // Check ensures delete requests for previously deleted features are aborted.
    if (getDeletedFeatureIds(getState()).includes(featureId)) {
      return;
    }

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
      dispatch(updateEditShape(DRAW_SHAPE.WAIT));
      await (layer as IVectorLayer).deleteFeature(featureId);
      dispatch(pushDeletedFeatureId(featureId));
      await dispatch(syncDataForLayerDueToDrawing(layer));
    } catch (e) {
      getToasts().addError(e, {
        title: i18n.translate('xpack.maps.mapActions.removeFeatureError', {
          defaultMessage: `Unable to remove feature from index.`,
        }),
      });
    }
    dispatch(updateEditShape(DRAW_SHAPE.DELETE));
  };
}
