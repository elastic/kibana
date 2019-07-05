/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { SettingsPanel } from './settings_panel';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import {
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlpha,
  updateSourceProp,
} from '../../../actions/store_actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    alpha: selectedLayer.getAlpha(),
    label: selectedLayer.getLabel(),
    layerId: selectedLayer.getId(),
    maxZoom: selectedLayer.getMaxZoom(),
    minZoom: selectedLayer.getMinZoom(),
    layer: selectedLayer
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateLabel: (id, label) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id, minZoom) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id, maxZoom) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlpha: (id, alpha) => dispatch(updateLayerAlpha(id, alpha)),
    updateSourceProp: (id, propName, value) => dispatch(updateSourceProp(id, propName, value)),
  };
}

const connectedSettingsPanel = connect(mapStateToProps, mapDispatchToProps)(SettingsPanel);
export { connectedSettingsPanel as SettingsPanel };
