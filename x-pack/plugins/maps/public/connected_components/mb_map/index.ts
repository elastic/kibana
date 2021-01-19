/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MBMap } from './mb_map';
import {
  mapExtentChanged,
  mapReady,
  mapDestroyed,
  setMouseCoordinates,
  clearMouseCoordinates,
  clearGoto,
  setMapInitError,
  MapExtentState,
} from '../../actions';
import {
  getLayerList,
  getMapReady,
  getGoto,
  getScrollZoom,
  getSpatialFiltersLayer,
  getMapSettings,
} from '../../selectors/map_selectors';
import { getInspectorAdapters } from '../../reducers/non_serializable_instances';
import { MapStoreState } from '../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isMapReady: getMapReady(state),
    settings: getMapSettings(state),
    layerList: getLayerList(state),
    spatialFiltersLayer: getSpatialFiltersLayer(state),
    goto: getGoto(state),
    inspectorAdapters: getInspectorAdapters(state),
    scrollZoom: getScrollZoom(state),
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
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MBMap);
export { connected as MBMap };
