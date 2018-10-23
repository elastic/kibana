/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { getFlyoutDisplay, updateFlyout, FLYOUT_STATE, LAYER_LOAD_STATE }
  from '../../store/ui';
import { getTemporaryLayers, getDataSources } from "../../selectors/map_selectors";
import {
  addPreviewLayer,
  removeLayer,
  clearTemporaryLayers,
  updateLayerLabel,
  // updateLayerShowAtAllZoomLevels,
  updateLayerMinZoom,
  updateLayerMaxZoom,
  setSelectedLayer
} from "../../actions/store_actions";
import { resetLayerLoad } from '../../actions/ui_actions';
import _ from 'lodash';

const layerLoadStatus = ({ ui }) => {
  const toastStatuses = {
    error: 'error',
    success: 'success'
  };
  const { layerLoad } = ui;
  return layerLoad.status === LAYER_LOAD_STATE.complete && toastStatuses.success ||
    layerLoad.status === LAYER_LOAD_STATE.error && toastStatuses.error;
};

function mapStateToProps(state = {}) {

  const dataSourceMeta = getDataSources(state);
  function isLoading() {
    const tmp = getTemporaryLayers(state);
    return tmp.some((layer) => layer.isLayerLoading());
  }
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    dataSourcesMeta: dataSourceMeta,
    layerLoading: isLoading(),
    temporaryLayers: !_.isEmpty(getTemporaryLayers(state)),
    layerLoadToast: layerLoadStatus(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(clearTemporaryLayers());
    },
    previewLayer: (layer) => {
      dispatch(addPreviewLayer(layer));
    },
    removeLayer: id => dispatch(removeLayer(id)),
    nextAction: id => {
      dispatch(setSelectedLayer(id));
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    updateLabel: (id, label) => dispatch(updateLayerLabel(id, label)),
    // updateShowAtAllZoomLevels: (id, showAtAllZoomLevels) => dispatch(updateLayerShowAtAllZoomLevels(id, showAtAllZoomLevels)),
    updateMinZoom: (id, minZoom) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id, maxZoom) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    clearLayerLoadToast: () => dispatch(resetLayerLoad())
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(AddLayerPanel);
export { connectedFlyOut as AddLayerPanel };
