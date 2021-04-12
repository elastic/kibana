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
import { updateEditMode } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setEditModeActive: () => dispatch(updateEditMode(true)),
    setEditModeInActive: () => dispatch(updateEditMode(false)),
  };
}

const connectedEditControl = connect(null, mapDispatchToProps)(EditControl);
export { connectedEditControl as EditControl };
