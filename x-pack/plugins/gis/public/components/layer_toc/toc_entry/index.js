/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../store/ui';
import { setSelectedLayer, toggleLayerVisible } from '../../../actions/map_actions';
import { getLayerById } from '../../../selectors/map_selectors';
import _ from 'lodash';

function mapDispatchToProps(dispatch) {
  return ({
    onButtonClick: layerId => {
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
      dispatch(setSelectedLayer(layerId));
    },
    toggleVisible: layerId => dispatch(toggleLayerVisible(layerId))
  });
}

function mapStateToProps(state) {
  return {
    layerVisible: layerId => _.get(getLayerById(state, layerId), 'visible')
  };
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
