/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../../common/constants';
import { setSelectedLayer } from '../../../actions/layer_actions';
import { setDrawMode, setIsLayerTOCOpen, updateFlyout } from '../../../actions/ui_actions';
import type { MapStoreState } from '../../../reducers/store';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { getLayerList } from '../../../selectors/map_selectors';
import {
  getFlyoutDisplay,
  getIsLayerTOCOpen,
  getIsReadOnly,
} from '../../../selectors/ui_selectors';
import { LayerControl } from './layer_control';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    isLayerTOCOpen: getIsLayerTOCOpen(state),
    layerList: getLayerList(state),
    isFlyoutOpen: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    showAddLayerWizard: async () => {
      await dispatch(setSelectedLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.ADD_LAYER_WIZARD));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
    closeLayerTOC: () => {
      dispatch(setIsLayerTOCOpen(false));
    },
    openLayerTOC: () => {
      dispatch(setIsLayerTOCOpen(true));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(LayerControl);
export { connected as LayerControl };
