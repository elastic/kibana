/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MbMap } from './mb_map';
import {
  clearGoto,
  clearMouseCoordinates,
  mapDestroyed,
  mapExtentChanged,
  mapReady,
  setAreTilesLoaded,
  setLayerDataLoadErrorStatus,
  setMapInitError,
  setMouseCoordinates,
  updateMetaFromTiles,
} from '../../actions';
import {
  getCustomIcons,
  getGoto,
  getLayerList,
  getMapReady,
  getMapSettings,
  getScrollZoom,
  getSpatialFiltersLayer,
  getTimeslice,
} from '../../selectors/map_selectors';
import { getDrawMode, getIsFullScreen } from '../../selectors/ui_selectors';
import { getInspectorAdapters } from '../../reducers/non_serializable_instances';
import { MapStoreState } from '../../reducers/store';
import { DRAW_MODE } from '../../../common/constants';
import { TileMetaFeature } from '../../../common/descriptor_types';
import type { MapExtentState } from '../../reducers/map/types';

function mapStateToProps(state: MapStoreState) {
  return {
    isMapReady: getMapReady(state),
    settings: getMapSettings(state),
    customIcons: getCustomIcons(state),
    layerList: getLayerList(state),
    spatialFiltersLayer: getSpatialFiltersLayer(state),
    goto: getGoto(state),
    inspectorAdapters: getInspectorAdapters(state),
    scrollZoom: getScrollZoom(state),
    isFullScreen: getIsFullScreen(state),
    timeslice: getTimeslice(state),
    featureModeActive:
      getDrawMode(state) === DRAW_MODE.DRAW_SHAPES || getDrawMode(state) === DRAW_MODE.DRAW_POINTS,
    filterModeActive: getDrawMode(state) === DRAW_MODE.DRAW_FILTERS,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    extentChanged: (mapExtentState: MapExtentState) => {
      dispatch(mapExtentChanged(mapExtentState));
    },
    onMapReady: (mapExtentState: MapExtentState) => {
      dispatch(clearGoto());
      dispatch(mapExtentChanged(mapExtentState));
      dispatch(mapReady());
    },
    onMapDestroyed: () => {
      dispatch(mapDestroyed());
    },
    setMouseCoordinates: ({ lat, lon }: { lat: number; lon: number }) => {
      dispatch(setMouseCoordinates({ lat, lon }));
    },
    clearMouseCoordinates: () => {
      dispatch(clearMouseCoordinates());
    },
    clearGoto: () => {
      dispatch(clearGoto());
    },
    setMapInitError(errorMessage: string) {
      dispatch(setMapInitError(errorMessage));
    },
    setAreTilesLoaded(layerId: string, areTilesLoaded: boolean) {
      dispatch(setAreTilesLoaded(layerId, areTilesLoaded));
    },
    updateMetaFromTiles(layerId: string, features: TileMetaFeature[]) {
      dispatch(updateMetaFromTiles(layerId, features));
    },
    clearTileLoadError(layerId: string) {
      dispatch(setLayerDataLoadErrorStatus(layerId, null));
    },
    setTileLoadError(layerId: string, errorMessage: string) {
      dispatch(setLayerDataLoadErrorStatus(layerId, errorMessage));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MbMap);
export { connected as MBMap };
