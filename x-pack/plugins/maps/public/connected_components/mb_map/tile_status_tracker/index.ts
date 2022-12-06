/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { TileMetaFeature } from '../../../../common/descriptor_types';
import {
  setAreTilesLoaded,
  setLayerDataLoadErrorStatus,
  updateMetaFromTiles,
} from '../../../actions';
import { getLayerList } from '../../../selectors/map_selectors';
import { MapStoreState } from '../../../reducers/store';
import { TileStatusTracker } from './tile_status_tracker';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getLayerList(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setAreTilesLoaded(layerId: string, areTilesLoaded: boolean) {
      dispatch(setAreTilesLoaded(layerId, areTilesLoaded));
    },
    updateMetaFromTiles(layerId: string, features: TileMetaFeature[]) {
      dispatch(updateMetaFromTiles(layerId, features));
    },
    clearTileLoadError(layerId: string) {
      dispatch(setLayerDataLoadErrorStatus(layerId, null));
    },
    setTileLoadError(layerId: string, errorMessage: string) {
      dispatch(setLayerDataLoadErrorStatus(layerId, errorMessage));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TileStatusTracker);
export { connected as TileStatusTracker };
