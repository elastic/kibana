/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { SettingsPanel } from './settings_panel';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import {
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlphaValue,
  updateSourceProp,
} from '../../../actions/store_actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    label: selectedLayer.getLabel(),
    layerId: selectedLayer.getId(),
    maxZoom: selectedLayer.getMaxZoom(),
    minZoom: selectedLayer.getMinZoom(),
    alphaValue: _.get(selectedLayer.getCurrentStyle(), '_descriptor.properties.alphaValue', 1),
    renderSourceDetails: selectedLayer.renderSourceDetails,
    renderSourceSettingsEditor: selectedLayer.renderSourceSettingsEditor
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateLabel: (id, label) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id, minZoom) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id, maxZoom) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlphaValue: (id, alphaValue) => dispatch(updateLayerAlphaValue(id, alphaValue)),
    updateSourceProp: (id, propName, value) => dispatch(updateSourceProp(id, propName, value)),
  };
}

const connectedSettingsPanel = connect(mapStateToProps, mapDispatchToProps)(SettingsPanel);
export { connectedSettingsPanel as SettingsPanel };
