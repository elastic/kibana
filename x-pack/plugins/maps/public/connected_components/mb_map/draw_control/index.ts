/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { setShapeToDraw } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { DrawControl } from './draw_control';
import { DRAW_TYPE } from '../../../../common';
import { getDrawState } from '../../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  const drawState = getDrawState(state);
  return {
    indexPatternId: drawState ? drawState.indexPatternId : undefined,
    geoField: drawState ? drawState.geoFieldName : undefined,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setShapeToDraw(shapeToDraw: DRAW_TYPE) {
      dispatch(setShapeToDraw(shapeToDraw));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(DrawControl);
export { connected as DrawControl };
