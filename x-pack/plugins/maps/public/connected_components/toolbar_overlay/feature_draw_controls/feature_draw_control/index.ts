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
import { setDrawMode, setShapeToDraw } from '../../../../actions';
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
    setDrawShape: (shapeToDraw: DRAW_TYPE) => {
      dispatch(setShapeToDraw(shapeToDraw));
    },
    cancelEditing: () => {
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
  };
}

const connectedFeatureEditControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(FeatureDrawControl);
export { connectedFeatureEditControl as FeatureDrawControl };
