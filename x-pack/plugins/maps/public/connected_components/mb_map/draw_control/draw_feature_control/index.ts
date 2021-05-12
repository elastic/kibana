/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { Geometry, Position } from 'geojson';
import { DrawFeatureControl } from './draw_feature_control';
import {
  addNewFeatureToIndex,
  removeFeaturesFromIndexQueue,
  setShapeToDraw,
} from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';
import { getDrawState, getShapeToDraw } from '../../../../selectors/map_selectors';
import { getDrawMode } from '../../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    drawType: getShapeToDraw(state),
    drawState: getDrawState(state),
    drawMode: getDrawMode(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    addNewFeatureToIndex(indexName: string, geometry: Geometry | Position[], path: string) {
      dispatch(addNewFeatureToIndex(indexName, geometry, path));
    },
    disableDrawState() {
      dispatch(setShapeToDraw(null));
    },
    removeFeatures(featureIds: string[]) {
      dispatch(removeFeaturesFromIndexQueue(featureIds));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(DrawFeatureControl);
export { connected as DrawFeatureControl };
