/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerControl } from './view';

import { FLYOUT_STATE } from '../../../reducers/ui';
import { setSelectedLayer, updateFlyout, setIsLayerTOCOpen } from '../../../actions';
import {
  getIsReadOnly,
  getIsLayerTOCOpen,
  getFlyoutDisplay,
} from '../../../selectors/ui_selectors';
import { getLayerList } from '../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    isReadOnly: getIsReadOnly(state),
    isLayerTOCOpen: getIsLayerTOCOpen(state),
    layerList: getLayerList(state),
    isFlyoutOpen: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    showAddLayerWizard: async () => {
      await dispatch(setSelectedLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.ADD_LAYER_WIZARD));
    },
    closeLayerTOC: () => {
      dispatch(setIsLayerTOCOpen(false));
    },
    openLayerTOC: () => {
      dispatch(setIsLayerTOCOpen(true));
    },
  };
}

const connectedLayerControl = connect(mapStateToProps, mapDispatchToProps)(LayerControl);
export { connectedLayerControl as LayerControl };
