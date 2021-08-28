/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { JoinDescriptor } from '../../../../common/descriptor_types/layer_descriptor_types';
import { setJoinsForLayer } from '../../../actions/layer_actions';
import type { ILayer } from '../../../classes/layers/layer';
import type { MapStoreState } from '../../../reducers/store';
import { getSelectedLayerJoinDescriptors } from '../../../selectors/map_selectors';
import { JoinEditor } from './join_editor';

function mapStateToProps(state: MapStoreState) {
  return {
    joins: getSelectedLayerJoinDescriptors(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    onChange: (layer: ILayer, joins: JoinDescriptor[]) => {
      dispatch(setJoinsForLayer(layer, joins));
    },
  };
}

const connectedJoinEditor = connect(mapStateToProps, mapDispatchToProps)(JoinEditor);
export { JoinField } from './join_editor';
export { connectedJoinEditor as JoinEditor };
