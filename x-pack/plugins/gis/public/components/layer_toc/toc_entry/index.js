/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../store/ui';
import { setSelectedLayer, toggleLayerVisible } from '../../../actions/store_actions';

function mapDispatchToProps(dispatch) {
  return ({
    onButtonClick: layerId => {
      dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    toggleVisible: layerId => dispatch(toggleLayerVisible(layerId))
  });
}

const connectedTOCEntry = connect(null, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
