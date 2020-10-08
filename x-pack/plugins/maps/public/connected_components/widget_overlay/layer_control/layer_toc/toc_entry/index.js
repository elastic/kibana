/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { FLYOUT_STATE } from '../../../../../reducers/ui';
import {
  getMapZoom,
  hasDirtyState,
  getSelectedLayer,
} from '../../../../../selectors/map_selectors';
import {
  getIsReadOnly,
  getOpenTOCDetails,
  getFlyoutDisplay,
} from '../../../../../selectors/ui_selectors';
import {
  setSelectedLayer,
  updateFlyout,
  hideTOCDetails,
  showTOCDetails,
} from '../../../../../actions';

function mapStateToProps(state = {}, ownProps) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: getMapZoom(state),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
    isLegendDetailsOpen: getOpenTOCDetails(state).includes(ownProps.layer.getId()),
    isEditButtonDisabled:
      flyoutDisplay !== FLYOUT_STATE.NONE && flyoutDisplay !== FLYOUT_STATE.LAYER_PANEL,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    openLayerPanel: async (layerId) => {
      await dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    hideTOCDetails: (layerId) => {
      dispatch(hideTOCDetails(layerId));
    },
    showTOCDetails: (layerId) => {
      dispatch(showTOCDetails(layerId));
    },
  };
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
