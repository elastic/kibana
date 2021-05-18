/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { MapStoreState } from '../../reducers/store';
import { getDrawMode } from '../../selectors/ui_selectors';
import { getLayersBySourceType } from '../../selectors/map_selectors';
import { DRAW_MODE, SOURCE_TYPES } from '../../../common';
import { setDrawMode } from '../../actions';

function mapStateToProps(state: MapStoreState) {
  return {
    showEditButton: !!getLayersBySourceType(SOURCE_TYPES.ES_SEARCH, state).length,
    shapeDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_SHAPES,
    pointDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_POINTS,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    cancelEditing: () => {
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(ToolbarOverlay);
export { connected as ToolbarOverlay };
