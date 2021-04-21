/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { EditControl } from './edit_control';
import { MapStoreState } from '../../../reducers/store';
import { DRAW_MODE } from '../../../../common';
import { setDrawMode } from '../../../actions';
import { getDrawMode } from '../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    featureModeActive:
      getDrawMode(state) === DRAW_MODE.DRAW_POINTS || getDrawMode(state) === DRAW_MODE.DRAW_SHAPES,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    activateDrawPointsMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_POINTS)),
    activateDrawShapesMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_SHAPES)),
    deactivateDrawMode: () => dispatch(setDrawMode(DRAW_MODE.NONE)),
  };
}

const connectedEditControl = connect(mapStateToProps, mapDispatchToProps)(EditControl);
export { connectedEditControl as EditControl };
