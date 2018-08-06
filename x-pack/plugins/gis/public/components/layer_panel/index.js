/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { setSelectedLayer } from '../../actions/store_actions';

const mapDispatchToProps = {
  cancelLayerPanel: () => updateFlyout(FLYOUT_STATE.NONE),
  saveLayerEdits: () => updateFlyout(FLYOUT_STATE.NONE) && setSelectedLayer(null)
};

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayer(state)
  };
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(LayerPanel);
export { connectedLayerPanel as LayerPanel };
