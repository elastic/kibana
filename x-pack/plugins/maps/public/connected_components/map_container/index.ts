/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MapContainer } from './map_container';
import {
  getFlyoutDisplay,
  getIsFullScreen,
  getIsTimesliderOpen,
} from '../../selectors/ui_selectors';
import { cancelAllInFlightRequests, exitFullScreen } from '../../actions';
import {
  areLayersLoaded,
  getLayerList,
  getMapInitError,
  getMapSettings,
  getQueryableUniqueIndexPatternIds,
} from '../../selectors/map_selectors';
import { MapStoreState } from '../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isTimesliderOpen: getIsTimesliderOpen(state),
    areLayersLoaded: areLayersLoaded(state),
    flyoutDisplay: getFlyoutDisplay(state),
    isFullScreen: getIsFullScreen(state),
    mapInitError: getMapInitError(state),
    indexPatternIds: getQueryableUniqueIndexPatternIds(state),
    settings: getMapSettings(state),
    layerList: getLayerList(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    exitFullScreen: () => dispatch(exitFullScreen()),
    cancelAllInFlightRequests: () => dispatch(cancelAllInFlightRequests()),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MapContainer);
export { connected as MapContainer };
