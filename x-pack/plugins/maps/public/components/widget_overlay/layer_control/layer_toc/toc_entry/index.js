/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { updateFlyout, FLYOUT_STATE } from '../../../../../store/ui';
import { fitToLayerExtent, setSelectedLayer, toggleLayerVisible } from '../../../../../actions/store_actions';

function mapStateToProps(state = {}) {
  return {
    zoom: _.get(state, 'map.mapState.zoom', 0)
  };
}

function mapDispatchToProps(dispatch) {
  return ({
    openLayerPanel: layerId => {
      dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    toggleVisible: layerId => {
      dispatch(toggleLayerVisible(layerId));
    },
    fitToBounds: (layerId) => {
      dispatch(fitToLayerExtent(layerId));
    }
  });
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
