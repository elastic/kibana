/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { JoinEditor } from './join_editor';
import {
  getSelectedLayer,
  getSelectedLayerJoinDescriptors,
} from '../../../selectors/map_selectors';
import { setJoinsForLayer } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { ILayer } from '../../../classes/layers/layer';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { IField } from '../../../classes/fields/field';

function mapStateToProps(state: MapStoreState) {
  return {
    joins: getSelectedLayerJoinDescriptors(state),
    layer: getSelectedLayer(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    onChange: (layer: ILayer, joins: JoinDescriptor[]) => {
      dispatch<any>(setJoinsForLayer(layer, joins));
    },
  };
}

interface StateProps {
  joins: JoinDescriptor[];
  layer: ILayer;
}

interface DispatchProps {
  onChange: (layer: ILayer, joins: JoinDescriptor[]) => void;
}

interface OwnProps {
  layerDisplayName: string;
  leftJoinFields: IField[];
}

const connectedJoinEditor = connect<StateProps, DispatchProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps
)(JoinEditor);
export { connectedJoinEditor as JoinEditor };
