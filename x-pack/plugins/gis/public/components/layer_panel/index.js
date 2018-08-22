/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { getSelectedLayerInstance } from '../../selectors/map_selectors';
import { updateFlyout, FLYOUT_STATE } from '../../store/ui';
import { clearTemporaryStyles } from '../../actions/style_actions';

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayerInstance(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    cancelLayerPanel: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(clearTemporaryStyles());
    }
  };
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps)(LayerPanel);
export { connectedLayerPanel as LayerPanel };
