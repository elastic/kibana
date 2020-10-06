/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { ToolsControl } from './tools_control';
import { isDrawingFilter } from '../../../selectors/map_selectors';
import { updateDrawState } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { DrawState } from '../../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  return {
    isDrawingFilter: isDrawingFilter(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    initiateDraw: (drawState: DrawState) => {
      dispatch(updateDrawState(drawState));
    },
    cancelDraw: () => {
      dispatch(updateDrawState(null));
    },
  };
}

const connectedToolsControl = connect(mapStateToProps, mapDispatchToProps)(ToolsControl);
export { connectedToolsControl as ToolsControl };
