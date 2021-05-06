/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { FeatureDrawControl } from './feature_draw_control';
import { isDrawingFilter } from '../../../../selectors/map_selectors';
import { updateDrawFeatureState } from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';
import { DRAW_TYPE } from '../../../../../common';

function mapStateToProps(state: MapStoreState) {
  return {
    isDrawingFilter: isDrawingFilter(state),
    drawType: state.map.mapState.drawFeatureState,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateCompletedShape: (drawFeatureState: DRAW_TYPE) => {
      dispatch(updateDrawFeatureState(drawFeatureState));
    },
    cancelDraw: () => {
      dispatch(updateDrawFeatureState(null));
    },
  };
}

const connectedFeatureEditControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(FeatureDrawControl);
export { connectedFeatureEditControl as FeatureDrawControl };
