/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { TOCEntry } from './toc_entry';
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
  cloneLayer,
  setSelectedLayer,
  updateFlyout,
  hideTOCDetails,
  showTOCDetails,
} from '../../../../../actions';
import { MapStoreState } from '../../../../../reducers/store';
import { ILayer } from '../../../../../classes/layers/layer';

interface OwnProps {
  layer: ILayer;
  dragHandleProps: unknown;
  isDragging: boolean;
  isDraggingOver: boolean;
}

function mapStateToProps(state: MapStoreState, ownProps: OwnProps) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: getMapZoom(state),
    selectedLayer: getSelectedLayer(state),
    hasDirtyState: hasDirtyState(state),
    isLegendDetailsOpen: getOpenTOCDetails(state).includes(ownProps.layer.getId()),
    areOpenPanelButtonsDisabled:
      flyoutDisplay !== FLYOUT_STATE.NONE && flyoutDisplay !== FLYOUT_STATE.LAYER_PANEL,
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    openLayerPanel: (layerId: string) => {
      dispatch<any>(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    cloneLayer: (layerId: string) => {
      dispatch<any>(cloneLayer(layerId));
    },
    hideTOCDetails: (layerId: string) => {
      dispatch(hideTOCDetails(layerId));
    },
    showTOCDetails: (layerId: string) => {
      dispatch(showTOCDetails(layerId));
    },
  };
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
