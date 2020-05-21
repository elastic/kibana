/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { FLYOUT_STATE, INDEXING_STAGE } from '../../reducers/ui';
import { getFlyoutDisplay, getIndexingStage } from '../../selectors/ui_selectors';
import {
  setTransientLayer,
  addLayer,
  setSelectedLayer,
  removeTransientLayer,
  updateFlyout,
  updateIndexingStage,
} from '../../actions';
import { MapStoreState } from '../../reducers/store';
import { LayerDescriptor } from '../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  const indexingStage = getIndexingStage(state);
  return {
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    isIndexingTriggered: indexingStage === INDEXING_STAGE.TRIGGERED,
    isIndexingSuccess: indexingStage === INDEXING_STAGE.SUCCESS,
    isIndexingReady: indexingStage === INDEXING_STAGE.READY,
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    previewLayer: async (layerDescriptor: LayerDescriptor) => {
      await dispatch(setSelectedLayer(null));
      await dispatch(removeTransientLayer());
      dispatch(addLayer(layerDescriptor));
      dispatch(setSelectedLayer(layerDescriptor.id));
      dispatch(setTransientLayer(layerDescriptor.id));
    },
    removeTransientLayer: () => {
      dispatch(setSelectedLayer(null));
      dispatch(removeTransientLayer());
    },
    selectLayerAndAdd: () => {
      dispatch(setTransientLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    setIndexingTriggered: () => dispatch(updateIndexingStage(INDEXING_STAGE.TRIGGERED)),
    resetIndexing: () => dispatch(updateIndexingStage(null)),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  AddLayerPanel
);
export { connected as AddLayerPanel };
