/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import {
  removeSelectedLayer,
  removeTrackedLayerStateForSelectedLayer,
  setSelectedLayer,
} from '../../../actions/layer_actions';
import { updateFlyout } from '../../../actions/ui_actions';
import type { MapStoreState } from '../../../reducers/store';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { hasDirtyState } from '../../../selectors/map_selectors';
import { FlyoutFooter } from './flyout_footer';

function mapStateToProps(state: MapStoreState) {
  return {
    hasStateChanged: hasDirtyState(state),
  };
}

const mapDispatchToProps = (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
  return {
    cancelLayerPanel: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(setSelectedLayer(null));
    },
    saveLayerEdits: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removeTrackedLayerStateForSelectedLayer());
      dispatch(setSelectedLayer(null));
    },
    removeLayer: () => {
      dispatch(removeSelectedLayer());
    },
  };
};

const connectedFlyoutFooter = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyoutFooter as FlyoutFooter };
