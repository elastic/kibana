/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { FeatureEditControl } from './feature_edit_control';
import { setShapeToDraw } from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';
import { DRAW_MODE, DRAW_TYPE } from '../../../../../common';
import { getDrawMode } from '../../../../selectors/ui_selectors';
import { getShapeToDraw } from '../../../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    filterModeActive: getDrawMode(state) === DRAW_MODE.DRAW_FILTERS,
    drawType: getShapeToDraw(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    initiateDraw: (shapeToDraw: DRAW_TYPE) => {
      dispatch(setShapeToDraw(shapeToDraw));
    },
    cancelDraw: () => {
      dispatch(setShapeToDraw(null));
    },
  };
}

const connectedFeatureEditControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(FeatureEditControl);
export { connectedFeatureEditControl as FeatureEditControl };
