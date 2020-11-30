/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MapContainer } from './map_container';
import { getFlyoutDisplay, getIsFullScreen } from '../../selectors/ui_selectors';
import { triggerRefreshTimer, cancelAllInFlightRequests, exitFullScreen } from '../../actions';
import {
  areLayersLoaded,
  getRefreshConfig,
  getMapInitError,
  getMapSettings,
  getQueryableUniqueIndexPatternIds,
  isToolbarOverlayHidden,
} from '../../selectors/map_selectors';
import { MapStoreState } from '../../reducers/store';
import { getCoreChrome } from '../../kibana_services';

function mapStateToProps(state: MapStoreState) {
  return {
    areLayersLoaded: areLayersLoaded(state),
    flyoutDisplay: getFlyoutDisplay(state),
    isFullScreen: getIsFullScreen(state),
    refreshConfig: getRefreshConfig(state),
    mapInitError: getMapInitError(state),
    indexPatternIds: getQueryableUniqueIndexPatternIds(state),
    hideToolbarOverlay: isToolbarOverlayHidden(state),
    backgroundColor: getMapSettings(state).backgroundColor,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    triggerRefreshTimer: () => dispatch(triggerRefreshTimer()),
    exitFullScreen: () => {
      dispatch(exitFullScreen());
      getCoreChrome().setIsVisible(true);
    },
    cancelAllInFlightRequests: () => dispatch(cancelAllInFlightRequests()),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MapContainer);
export { connected as MapContainer };
