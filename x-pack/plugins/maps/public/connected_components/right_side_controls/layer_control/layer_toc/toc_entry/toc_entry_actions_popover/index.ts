/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import type { Query } from 'src/plugins/data/public';
import { MapStoreState } from '../../../../../../reducers/store';
import {
  cloneLayer,
  fitToLayerExtent,
  removeLayer,
  setDrawMode,
  showThisLayerOnly,
  toggleLayerVisible,
  updateEditLayer,
} from '../../../../../../actions';
import { getLayerListRaw } from '../../../../../../selectors/map_selectors';
import { getIsReadOnly } from '../../../../../../selectors/ui_selectors';
import { TOCEntryActionsPopover } from './toc_entry_actions_popover';
import { DRAW_MODE } from '../../../../../../../common/constants';
import { updateSourceProp, setLayerQuery } from '../../../../../../actions';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    numLayers: getLayerListRaw(state).length,
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
    enableShapeEditing: (layerId: string) => {
      dispatch(updateEditLayer(layerId));
      dispatch(setDrawMode(DRAW_MODE.DRAW_SHAPES));
    },
    enablePointEditing: (layerId: string) => {
      dispatch(updateEditLayer(layerId));
      dispatch(setDrawMode(DRAW_MODE.DRAW_POINTS));
    },
    showThisLayerOnly: (layerId: string) => {
      dispatch(showThisLayerOnly(layerId));
    },
    updateSourceProp: (id: string, propName: string, value: unknown) =>
      dispatch(updateSourceProp(id, propName, value)),
    setLayerQuery: (layerId: string, query: Query) => {
      dispatch(setLayerQuery(layerId, query));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TOCEntryActionsPopover);
export { connected as TOCEntryActionsPopover };
