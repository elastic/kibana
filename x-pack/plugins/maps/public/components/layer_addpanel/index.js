/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getSelectedLayer, getMapColors } from '../../selectors/map_selectors';
import { getInspectorAdapters } from '../../store/non_serializable_instances';
import {
  removeLayer,
  setTransientLayer,
  addLayer,
  setSelectedLayer,
  removeTransientLayer
} from '../../actions/store_actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    inspectorAdapters: getInspectorAdapters(state),
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    hasLayerSelected: !!selectedLayer,
    isLoading: selectedLayer && selectedLayer.isLayerLoading(),
    mapColors: getMapColors(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: layerId => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removeTransientLayer());
      dispatch(setSelectedLayer(null));
      dispatch(removeLayer(layerId));
    },
    previewLayer: layer => {
      dispatch(addLayer(layer.toLayerDescriptor()));
      dispatch(setSelectedLayer(layer.getId()));
      dispatch(setTransientLayer(layer.getId()));
    },
    removeLayer: () => {
      dispatch(setSelectedLayer(null));
      dispatch(removeTransientLayer());
    },
    selectLayerAndAdd: () => {
      dispatch(setTransientLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(AddLayerPanel);
export { connectedFlyOut as AddLayerPanel };
