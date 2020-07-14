/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { MapStoreState } from '../../../../../../reducers/store';
import {
  fitToLayerExtent,
  toggleLayerVisible,
  cloneLayer,
  removeLayer,
} from '../../../../../../actions';
import { getMapZoom, isUsingSearch } from '../../../../../../selectors/map_selectors';
import { getIsReadOnly } from '../../../../../../selectors/ui_selectors';
import { TOCEntryActionsPopover } from './toc_entry_actions_popover';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    isUsingSearch: isUsingSearch(state),
    zoom: getMapZoom(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    cloneLayer: (layerId: string) => {
      dispatch<any>(cloneLayer(layerId));
    },
    fitToBounds: (layerId: string) => {
      dispatch<any>(fitToLayerExtent(layerId));
    },
    removeLayer: (layerId: string) => {
      dispatch<any>(removeLayer(layerId));
    },
    toggleVisible: (layerId: string) => {
      dispatch<any>(toggleLayerVisible(layerId));
    },
  };
}

const connectedTOCEntryActionsPopover = connect(
  mapStateToProps,
  mapDispatchToProps
)(TOCEntryActionsPopover);
export { connectedTOCEntryActionsPopover as TOCEntryActionsPopover };
