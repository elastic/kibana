/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { DrawFilterControl } from './draw_filter_control';
import { updateDrawState } from '../../../../actions';
import {
  getDrawState,
  isDrawingFilter,
  getGeoFieldNames,
} from '../../../../selectors/map_selectors';
import { MapStoreState } from '../../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isDrawingFilter: isDrawingFilter(state),
    drawState: getDrawState(state),
    geoFieldNames: getGeoFieldNames(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    disableDrawState() {
      dispatch(updateDrawState(null));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(DrawFilterControl);
export { connected as DrawFilterControl };
