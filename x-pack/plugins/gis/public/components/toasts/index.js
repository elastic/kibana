/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LAYER_LOAD_STATE } from '../../store/ui';
import { Toasts } from './view';
import { resetLayerLoad } from '../../actions/ui_actions';

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
  return {
    layerLoadToast: layerLoadStatus(state)
  };
}
function mapDispatchToProps(dispatch) {
  return {
    clearLayerLoadToast: () => dispatch(resetLayerLoad())
  };
}

const connectedToast = connect(mapStateToProps, mapDispatchToProps)(Toasts);
export { connectedToast as Toasts };