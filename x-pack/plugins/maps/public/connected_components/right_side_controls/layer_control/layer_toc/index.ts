/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { updateLayerOrder } from '../../../../actions/layer_actions';
import type { MapStoreState } from '../../../../reducers/store';
import { getLayerList } from '../../../../selectors/map_selectors';
import { getIsReadOnly } from '../../../../selectors/ui_selectors';
import { LayerTOC } from './layer_toc';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    layerList: getLayerList(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateLayerOrder: (newOrder: number[]) => dispatch(updateLayerOrder(newOrder)),
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(LayerTOC);
export { connected as LayerTOC };
