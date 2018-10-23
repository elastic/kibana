/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { updateFlyout, FLYOUT_STATE } from '../../store/ui';
import {
  clearTemporaryStyles,
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom
} from '../../actions/store_actions';

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayer(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    cancelLayerPanel: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      //todo: needs to be a generic layer-reset, not just styles
      // e.g. filters, data-enrichment, style... all would need to revert to the original
      dispatch(clearTemporaryStyles());
    },
    updateLabel: (id, label) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id, minZoom) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id, maxZoom) => dispatch(updateLayerMaxZoom(id, maxZoom))
  };
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps)(LayerPanel);
export { connectedLayerPanel as LayerPanel };
