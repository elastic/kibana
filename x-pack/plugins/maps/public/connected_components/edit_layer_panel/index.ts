/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { EditLayerPanel } from './edit_layer_panel';
import { LAYER_TYPE } from '../../../common/constants';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { updateSourceProp } from '../../actions';
import { MapStoreState } from '../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  const selectedLayer = getSelectedLayer(state);
  return {
    key: selectedLayer ? `${selectedLayer.getId()}${selectedLayer.showJoinEditor()}` : '',
    selectedLayer,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateSourceProp: (id: string, propName: string, value: unknown, newLayerType?: LAYER_TYPE) =>
      dispatch(updateSourceProp(id, propName, value, newLayerType)),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(EditLayerPanel);
export { connected as EditLayerPanel };
