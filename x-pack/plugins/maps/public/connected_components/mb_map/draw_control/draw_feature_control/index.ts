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
import {
  DrawFeatureControl,
  ReduxDispatchProps,
  ReduxStateProps,
  OwnProps,
} from './draw_feature_control';
import { addNewFeatureToIndex, updateEditShape } from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';
import { getShapeToDraw } from '../../../../selectors/map_selectors';
import { getDrawMode } from '../../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState): ReduxStateProps {
  return {
    drawShape: getShapeToDraw(state),
    drawMode: getDrawMode(state),
  };
}

function mapDispatchToProps(
  dispatch: ThunkDispatch<MapStoreState, void, AnyAction>
): ReduxDispatchProps {
  return {
    addNewFeatureToIndex(geometry: Geometry | Position[]) {
      dispatch(addNewFeatureToIndex(geometry));
    },
    disableDrawState() {
      dispatch(updateEditShape(null));
    },
  };
}

const connected = connect<ReduxStateProps, ReduxDispatchProps, OwnProps, MapStoreState>(
  mapStateToProps,
  mapDispatchToProps
)(DrawFeatureControl);
export { connected as DrawFeatureControl };
