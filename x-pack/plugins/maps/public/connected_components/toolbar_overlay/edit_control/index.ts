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

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    activateDrawFeatureMode: () => dispatch(setDrawMode(DRAW_MODE.DRAW_FEATURES)),
    deactivateDrawMode: () => dispatch(setDrawMode(DRAW_MODE.NONE)),
  };
}

const connectedEditControl = connect(null, mapDispatchToProps)(EditControl);
export { connectedEditControl as EditControl };
