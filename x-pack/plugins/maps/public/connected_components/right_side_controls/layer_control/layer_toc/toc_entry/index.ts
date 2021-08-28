/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../../../../common/constants';
import { fitToLayerExtent } from '../../../../../actions/data_request_actions';
import { setSelectedLayer, toggleLayerVisible } from '../../../../../actions/layer_actions';
import { updateDrawState } from '../../../../../actions/map_actions';
import {
  hideTOCDetails,
  setDrawMode,
  showTOCDetails,
  updateFlyout,
} from '../../../../../actions/ui_actions';
import type { MapStoreState } from '../../../../../reducers/store';
import { FLYOUT_STATE } from '../../../../../reducers/ui';
import {
  getEditState,
  getMapZoom,
  getSelectedLayer,
  hasDirtyState,
} from '../../../../../selectors/map_selectors';
import {
  getFlyoutDisplay,
  getIsReadOnly,
  getOpenTOCDetails,
} from '../../../../../selectors/ui_selectors';
import type { OwnProps, ReduxDispatchProps, ReduxStateProps } from './toc_entry';
import { TOCEntry } from './toc_entry';

function mapStateToProps(state: MapStoreState, ownProps: OwnProps): ReduxStateProps {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: getMapZoom(state),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
    isLegendDetailsOpen: getOpenTOCDetails(state).includes(ownProps.layer.getId()),
    isEditButtonDisabled:
      flyoutDisplay !== FLYOUT_STATE.NONE && flyoutDisplay !== FLYOUT_STATE.LAYER_PANEL,
    editModeActiveForLayer: getEditState(state)?.layerId === ownProps.layer.getId(),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    fitToBounds: (layerId: string) => {
      dispatch(fitToLayerExtent(layerId));
    },
    openLayerPanel: async (layerId: string) => {
      await dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    hideTOCDetails: (layerId: string) => {
      dispatch(hideTOCDetails(layerId));
    },
    showTOCDetails: (layerId: string) => {
      dispatch(showTOCDetails(layerId));
    },
    toggleVisible: (layerId: string) => {
      dispatch(toggleLayerVisible(layerId));
    },
    cancelEditing: () => {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
  };
}

const connected = connect<ReduxStateProps, ReduxDispatchProps, OwnProps, MapStoreState>(
  mapStateToProps,
  mapDispatchToProps
)(TOCEntry);
export { connected as TOCEntry };
