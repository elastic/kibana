/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { Feature } from 'geojson';
import { DrawFeatureControl } from './draw_feature_control';
import {
  addFeaturesToIndexQueue,
  removeFeaturesFromIndexQueue,
  setShapeToDraw,
} from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    drawType: state.map.mapState.shapeToDraw,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    addFeaturesToIndexQueue(features: Feature[]) {
      dispatch(addFeaturesToIndexQueue(features));
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
