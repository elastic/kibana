/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../common/constants';
import { LayerDescriptor } from '../../../common/descriptor_types';
import {
  addPreviewLayers,
  promotePreviewLayers,
  removePreviewLayers,
  setAutoOpenLayerWizardId,
  setDrawMode,
  setEditLayerToSelectedLayer,
  setFirstPreviewLayerToSelectedLayer,
  updateFlyout,
} from '../../actions';
import { MapStoreState } from '../../reducers/store';
import { FLYOUT_STATE } from '../../reducers/ui';
import { hasPreviewLayers } from '../../selectors/map_selectors';
import { getAutoOpenLayerWizardId } from '../../selectors/ui_selectors';
import { AddLayerPanel } from './view';

function mapStateToProps(state: MapStoreState) {
  return {
    hasPreviewLayers: hasPreviewLayers(state),
    autoOpenLayerWizardId: getAutoOpenLayerWizardId(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    addPreviewLayers: (layerDescriptors: LayerDescriptor[]) => {
      dispatch(addPreviewLayers(layerDescriptors));
    },
    addLayersAndClose: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(promotePreviewLayers());
    },
    addLayersAndContinue: () => {
      dispatch(setFirstPreviewLayerToSelectedLayer());
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
      dispatch(promotePreviewLayers());
    },
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removePreviewLayers());
    },
    enableEditMode: () => {
      dispatch(setEditLayerToSelectedLayer());
      dispatch(setDrawMode(DRAW_MODE.DRAW_SHAPES));
    },
    clearAutoOpenLayerWizardId: () => {
      dispatch(setAutoOpenLayerWizardId(''));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  AddLayerPanel
);
export { connected as AddLayerPanel };
