/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { updateEditShape } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { DrawControl } from './draw_control';
import { DRAW_SHAPE } from '../../../../common/constants';

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateEditShape(shapeToDraw: DRAW_SHAPE) {
      dispatch(updateEditShape(shapeToDraw));
    },
  };
}

const connected = connect(null, mapDispatchToProps)(DrawControl);
export { connected as DrawControl };
