/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DRAW_MODE } from '../../../../common/constants';
import { TooltipState } from '../../../../common/descriptor_types';
import {
  closeOnClickTooltip,
  closeOnHoverTooltip,
  openOnClickTooltip,
  openOnHoverTooltip,
  updateOpenTooltips,
} from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import {
  getExecutionContext,
  getGeoFieldNames,
  getHasLockedTooltips,
  getLayerList,
  getOpenTooltips,
} from '../../../selectors/map_selectors';
import { getDrawMode } from '../../../selectors/ui_selectors';
import { TooltipControl } from './tooltip_control';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getLayerList(state),
    hasLockedTooltips: getHasLockedTooltips(state),
    filterModeActive: getDrawMode(state) === DRAW_MODE.DRAW_FILTERS,
    drawModeActive:
      getDrawMode(state) === DRAW_MODE.DRAW_SHAPES || getDrawMode(state) === DRAW_MODE.DRAW_POINTS,
    openTooltips: getOpenTooltips(state),
    geoFieldNames: getGeoFieldNames(state),
    executionContext: getExecutionContext(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    closeOnClickTooltip(tooltipId: string) {
      dispatch(closeOnClickTooltip(tooltipId));
    },
    openOnClickTooltip(tooltipState: TooltipState) {
      dispatch(openOnClickTooltip(tooltipState));
    },
    closeOnHoverTooltip() {
      dispatch(closeOnHoverTooltip());
    },
    openOnHoverTooltip(tooltipState: TooltipState) {
      dispatch(openOnHoverTooltip(tooltipState));
    },
    updateOpenTooltips(openTooltips: TooltipState[]) {
      dispatch(updateOpenTooltips(openTooltips));
    },
  };
}

const connectedTooltipControl = connect(mapStateToProps, mapDispatchToProps)(TooltipControl);
export { connectedTooltipControl as TooltipControl };
