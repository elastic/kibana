/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MBMapContainer } from './view';
import {
  mapExtentChanged,
  mapReady,
  mapDestroyed,
  setMouseCoordinates,
  clearMouseCoordinates,
  clearGoto,
  setTooltipState,
  DRAW_STATE_TYPE,
  updateDrawStateWithOptions
} from '../../../actions/store_actions';
import {
  getTooltipState,
  getLayerList,
  getMapReady,
  getGoto,
  getDrawState,
  getIsDrawingFilter,
  getScrollZoom
} from '../../../selectors/map_selectors';
import { getIsFilterable } from '../../../store/ui';
import { getInspectorAdapters } from '../../../store/non_serializable_instances';

function mapStateToProps(state = {}) {
  return {
    isFilterable: getIsFilterable(state),
    isMapReady: getMapReady(state),
    layerList: getLayerList(state),
    goto: getGoto(state),
    inspectorAdapters: getInspectorAdapters(state),
    tooltipState: getTooltipState(state),
    drawState: getDrawState(state),
    isDrawingFilter: getIsDrawingFilter(state),
    scrollZoom: getScrollZoom(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    extentChanged: (e) => {
      dispatch(mapExtentChanged(e));
    },
    onMapReady: (e) => {
      dispatch(clearGoto());
      dispatch(mapExtentChanged(e));
      dispatch(mapReady());
    },
    onMapDestroyed: () => {
      dispatch(mapDestroyed());
    },
    setMouseCoordinates: ({ lat, lon }) => {
      dispatch(setMouseCoordinates({ lat, lon }));
    },
    clearMouseCoordinates: () => {
      dispatch(clearMouseCoordinates());
    },
    clearGoto: () => {
      dispatch(clearGoto());
    },
    setTooltipState(tooltipState) {
      dispatch(setTooltipState(tooltipState));
    },
    disableDrawState() {
      dispatch(updateDrawStateWithOptions(DRAW_STATE_TYPE.NONE, null));
    }
  };
}

const connectedMBMapContainer = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(MBMapContainer);
export { connectedMBMapContainer as MBMapContainer };
