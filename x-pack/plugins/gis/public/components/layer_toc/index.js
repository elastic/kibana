/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerTOC } from './view';
import { updateFlyout, setSelectedLayer, getSelectedLayer, FLYOUT_STATE }
  from '../../store/ui';

const mapDispatchToProps = {
  showLayerDetails: layer =>
    updateFlyout(FLYOUT_STATE.LAYER_PANEL) && setSelectedLayer(layer)
};

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayer(state)
  };
}

const connectedLayerTOC = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(LayerTOC);
export { connectedLayerTOC as LayerTOC };
