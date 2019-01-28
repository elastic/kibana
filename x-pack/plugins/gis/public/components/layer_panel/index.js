/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { getSelectedLayer } from '../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayer(state)
  };
}

function mapDispatchToProps(/* dispatch */) {
  return {};
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps)(LayerPanel);
export { connectedLayerPanel as LayerPanel };
