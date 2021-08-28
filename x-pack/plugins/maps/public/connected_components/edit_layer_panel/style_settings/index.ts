/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { StyleDescriptor } from '../../../../common/descriptor_types/style_property_descriptor_types';
import { updateLayerStyleForSelectedLayer } from '../../../actions/layer_actions';
import type { MapStoreState } from '../../../reducers/store';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { StyleSettings } from './style_settings';

function mapStateToProps(state: MapStoreState) {
  return {
    layer: getSelectedLayer(state)!,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => {
      dispatch(updateLayerStyleForSelectedLayer(styleDescriptor));
    },
  };
}

const connectedStyleSettings = connect(mapStateToProps, mapDispatchToProps)(StyleSettings);
export { connectedStyleSettings as StyleSettings };
