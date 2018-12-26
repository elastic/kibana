/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerControl } from './view';
import {
  getIsSetViewOpen,
  closeSetView,
  openSetView,
  updateFlyout,
  FLYOUT_STATE
} from '../../store/ui';

function mapStateToProps(state = {}) {
  return {
    isSetViewOpen: getIsSetViewOpen(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    showAddLayerWizard: () => {
      dispatch(updateFlyout(FLYOUT_STATE.ADD_LAYER_WIZARD));
    },
    closeSetView: () => {
      dispatch(closeSetView());
    },
    openSetView: () => {
      dispatch(openSetView());
    }
  };
}

const connectedLayerControl = connect(mapStateToProps, mapDispatchToProps)(LayerControl);
export { connectedLayerControl as LayerControl };
