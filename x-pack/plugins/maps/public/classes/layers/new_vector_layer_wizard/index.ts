/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { MapStoreState } from '../../../reducers/store';
import { NewVectorLayerEditor } from './wizard';
import { updateEditMode } from '../../../actions';

function mapStateToProps(state: MapStoreState) {
  return {};
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setEditModeActive: () => dispatch(updateEditMode(true)),
    setEditModeInActive: () => dispatch(updateEditMode(false)),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(NewVectorLayerEditor);
export { connected as NewVectorLayerEditor };
