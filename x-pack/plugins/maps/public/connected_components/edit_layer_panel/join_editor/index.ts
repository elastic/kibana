/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { setJoinsForLayer } from '../../../actions';
import { ILayer } from '../../../classes/layers/layer';
import { MapStoreState } from '../../../reducers/store';
import { getSelectedLayerJoinDescriptors } from '../../../selectors/map_selectors';
import { JoinEditor } from './join_editor';

function mapStateToProps(state: MapStoreState) {
  return {
    joins: getSelectedLayerJoinDescriptors(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    onChange: (layer: ILayer, joins: Array<Partial<JoinDescriptor>>) => {
      dispatch(setJoinsForLayer(layer, joins));
    },
  };
}

const connectedJoinEditor = connect(mapStateToProps, mapDispatchToProps)(JoinEditor);
export { connectedJoinEditor as JoinEditor };
export type { JoinField } from './join_editor';
