/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MapStoreState } from '../../../../../../reducers/store';
import {
  fitToLayerExtent,
  toggleLayerVisible,
  cloneLayer,
  removeLayer,
} from '../../../../../../actions';
import { getIsReadOnly } from '../../../../../../selectors/ui_selectors';
import { TOCEntryActionsPopover } from './toc_entry_actions_popover';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    cloneLayer: (layerId: string) => {
      dispatch(cloneLayer(layerId));
    },
    fitToBounds: (layerId: string) => {
      dispatch(fitToLayerExtent(layerId));
    },
    removeLayer: (layerId: string) => {
      dispatch(removeLayer(layerId));
    },
    toggleVisible: (layerId: string) => {
      dispatch(toggleLayerVisible(layerId));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TOCEntryActionsPopover);
export { connected as TOCEntryActionsPopover };
