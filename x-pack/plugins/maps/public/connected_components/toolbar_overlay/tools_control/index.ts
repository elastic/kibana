/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { ToolsControl } from './tools_control';
import { setDrawMode, updateDrawState } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { DrawState } from '../../../../common/descriptor_types';
import { DRAW_MODE } from '../../../../common/constants';
import { getDrawMode } from '../../../selectors/ui_selectors';
import { getMapZoom } from '../../../selectors/map_selectors';
import { setGotoWithCenter,setMouseCoordinates } from '../../../actions';


function mapStateToProps(state: MapStoreState) {
  const drawMode = getDrawMode(state);
  return {
    filterModeActive: drawMode === DRAW_MODE.DRAW_FILTERS,
    zoom: getMapZoom(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    cancelDraw: () => {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
    initiateDraw: (drawState: DrawState) => {
      dispatch(setDrawMode(DRAW_MODE.DRAW_FILTERS));
      dispatch(updateDrawState(drawState));
    },
    centerMap: (lat:number, lon:number, zoom:number) => {
      dispatch(setGotoWithCenter({ lat, lon, zoom }));
    },
    setCoordinates:(lat:number, lon:number ) => {
      dispatch(setMouseCoordinates({lat,lon}))
    }
  };
}

const connectedToolsControl = connect(mapStateToProps, mapDispatchToProps)(ToolsControl);
export { connectedToolsControl as ToolsControl };
