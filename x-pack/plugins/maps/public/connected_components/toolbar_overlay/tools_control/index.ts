/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../../common/constants';
import { DrawState } from '../../../../common/descriptor_types';
import { setDrawMode, updateDrawState } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { getDrawMode } from '../../../selectors/ui_selectors';
import { ToolsControl } from './tools_control';

function mapStateToProps(state: MapStoreState) {
  const drawMode = getDrawMode(state);
  return {
    filterModeActive: drawMode === DRAW_MODE.DRAW_FILTERS,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    cancelDraw: () => {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
    initiateDraw: (drawState: DrawState) => {
      dispatch(setDrawMode(DRAW_MODE.DRAW_FILTERS));
      dispatch(updateDrawState(drawState));
    },
  };
}

const connectedToolsControl = connect(mapStateToProps, mapDispatchToProps)(ToolsControl);
export { connectedToolsControl as ToolsControl };
