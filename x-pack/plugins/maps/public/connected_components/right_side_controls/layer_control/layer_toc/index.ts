/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { LayerTOC } from './layer_toc';
import { createLayerGroup, setLayerParent, updateLayerOrder } from '../../../../actions';
import { getLayerList } from '../../../../selectors/map_selectors';
import { getIsReadOnly, getOpenTOCDetails } from '../../../../selectors/ui_selectors';
import { MapStoreState } from '../../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    layerList: getLayerList(state),
    openTOCDetails: getOpenTOCDetails(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    createLayerGroup: (draggedLayerId: string, combineWithLayerId: string) =>
      dispatch(createLayerGroup(draggedLayerId, combineWithLayerId)),
    setLayerParent: (layerId: string, parent: string | undefined) => dispatch(setLayerParent(layerId, parent)),
    updateLayerOrder: (newOrder: number[]) => dispatch(updateLayerOrder(newOrder)),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(LayerTOC);
export { connected as LayerTOC };
