/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { ToolsControl } from './tools_control';
import { isDrawingFilter } from '../../../selectors/map_selectors';
import { setDrawMode, updateDrawState } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { DrawState } from '../../../../common/descriptor_types';
import { DRAW_MODE } from '../../../../common';
import { getDrawMode } from '../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    isDrawingFilter: isDrawingFilter(state),
    featureModeActive:
      getDrawMode(state) === DRAW_MODE.DRAW_POINTS || getDrawMode(state) === DRAW_MODE.DRAW_SHAPES,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    initiateDraw: (drawState: DrawState) => {
      dispatch(updateDrawState(drawState));
    },
    cancelDraw: () => {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
    activateDrawFilterMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_FILTERS)),
    activateDrawPointsMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_POINTS)),
    activateDrawShapesMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_SHAPES)),
    deactivateDrawMode: () => dispatch(setDrawMode(DRAW_MODE.NONE)),
  };
}

const connectedToolsControl = connect(mapStateToProps, mapDispatchToProps)(ToolsControl);
export { connectedToolsControl as ToolsControl };
