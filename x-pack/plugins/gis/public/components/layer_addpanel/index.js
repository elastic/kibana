/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE }
  from '../../store/ui';
import { getTemporaryLayers } from "../../selectors/map_selectors";
import {
  addLayer,
  removeLayer,
  clearTemporaryLayers,
  setSelectedLayer,
} from "../../actions/store_actions";
import _ from 'lodash';

function mapStateToProps(state = {}) {

  function isLoading() {
    const tmp = getTemporaryLayers(state);
    return tmp.some((layer) => layer.isLayerLoading());
  }
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    layerLoading: isLoading(),
    temporaryLayers: !_.isEmpty(getTemporaryLayers(state))
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(clearTemporaryLayers());
    },
    previewLayer: (layer) => {
      dispatch(addLayer(layer.toLayerDescriptor()));
    },
    removeLayer: id => dispatch(removeLayer(id)),
    nextAction: id => {
      dispatch(setSelectedLayer(id));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(AddLayerPanel);
export { connectedFlyOut as AddLayerPanel };
