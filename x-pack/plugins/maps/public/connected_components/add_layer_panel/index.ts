/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { FLYOUT_STATE } from '../../reducers/ui';
import {
  addPreviewLayers,
  promotePreviewLayers,
  removePreviewLayers,
  setFirstPreviewLayerToSelectedLayer,
  updateFlyout,
} from '../../actions';
import { MapStoreState } from '../../reducers/store';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { hasPreviewLayers, isLoadingPreviewLayers } from '../../selectors/map_selectors';

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
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  AddLayerPanel
);
export { connected as AddLayerPanel };
