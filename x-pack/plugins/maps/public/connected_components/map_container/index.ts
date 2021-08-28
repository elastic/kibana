/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { cancelAllInFlightRequests } from '../../actions/data_request_actions';
import { exitFullScreen } from '../../actions/ui_actions';
import type { MapStoreState } from '../../reducers/store';
import {
  areLayersLoaded,
  getLayerList,
  getMapInitError,
  getMapSettings,
  getQueryableUniqueIndexPatternIds,
} from '../../selectors/map_selectors';
import { getFlyoutDisplay, getIsFullScreen } from '../../selectors/ui_selectors';
import { MapContainer } from './map_container';

function mapStateToProps(state: MapStoreState) {
  return {
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
