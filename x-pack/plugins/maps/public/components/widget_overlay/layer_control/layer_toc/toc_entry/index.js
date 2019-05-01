/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { getIsReadOnly, updateFlyout, FLYOUT_STATE } from '../../../../../store/ui';
import {
  fitToLayerExtent,
  setSelectedLayer,
  toggleLayerVisible,
  removeTransientLayer,
  cloneLayer,
} from '../../../../../actions/store_actions';

import { hasDirtyState, getSelectedLayer } from '../../../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: _.get(state, 'map.mapState.zoom', 0),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
  };
}

function mapDispatchToProps(dispatch) {
  return ({
    openLayerPanel: async layerId => {
      await dispatch(removeTransientLayer());
      await dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    toggleVisible: layerId => {
      dispatch(toggleLayerVisible(layerId));
    },
    fitToBounds: layerId => {
      dispatch(fitToLayerExtent(layerId));
    },
    cloneLayer: layerId => {
      dispatch(cloneLayer(layerId));
    }
  });
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
