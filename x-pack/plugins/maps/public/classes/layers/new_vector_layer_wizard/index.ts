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
import {
  addLayer,
  indexDrawnLayers,
  setSelectedLayer,
  setVectorLayerIndexName,
  updateEditMode,
  updateFlyout,
} from '../../../actions';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { LayerDescriptor } from '../../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  return {
    indexName: state.map.mapState.vectorLayerIndexName,
    featuresQueued: state.map.mapState.featuresToIndexQueue,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setEditModeActive: () => dispatch(updateEditMode(true)),
    setEditModeInActive: () => dispatch(updateEditMode(false)),
    setIndexName: (indexName: string) => dispatch(setVectorLayerIndexName(indexName)),
    indexDrawnLayers: () => {
      dispatch(indexDrawnLayers());
    },
    addNewLayer: async (layerDescriptor: LayerDescriptor) => {
      dispatch(addLayer(layerDescriptor));
      await dispatch(setSelectedLayer(layerDescriptor.id));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(NewVectorLayerEditor);
export { connected as NewVectorLayerEditor };
