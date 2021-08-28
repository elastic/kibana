/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../common/constants';
import type { LayerDescriptor } from '../../../common/descriptor_types/layer_descriptor_types';
import {
  addPreviewLayers,
  promotePreviewLayers,
  removePreviewLayers,
  setFirstPreviewLayerToSelectedLayer,
} from '../../actions/layer_actions';
import { setEditLayerToSelectedLayer } from '../../actions/map_actions';
import { setDrawMode, updateFlyout } from '../../actions/ui_actions';
import type { MapStoreState } from '../../reducers/store';
import { FLYOUT_STATE } from '../../reducers/ui';
import { hasPreviewLayers, isLoadingPreviewLayers } from '../../selectors/map_selectors';
import { AddLayerPanel } from './view';

function mapStateToProps(state: MapStoreState) {
  return {
    hasPreviewLayers: hasPreviewLayers(state),
    isLoadingPreviewLayers: isLoadingPreviewLayers(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    addPreviewLayers: (layerDescriptors: LayerDescriptor[]) => {
      dispatch(addPreviewLayers(layerDescriptors));
    },
    promotePreviewLayers: () => {
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
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  AddLayerPanel
);
export { connected as AddLayerPanel };
