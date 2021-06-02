/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { TooltipState } from '../../../../common/descriptor_types';
import { TooltipControl } from './tooltip_control';
import {
  closeOnClickTooltip,
  openOnClickTooltip,
  closeOnHoverTooltip,
  openOnHoverTooltip,
} from '../../../actions';
import {
  getLayerList,
  getOpenTooltips,
  getHasLockedTooltips,
  getGeoFieldNames,
  isDrawingFilter,
} from '../../../selectors/map_selectors';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getLayerList(state),
    hasLockedTooltips: getHasLockedTooltips(state),
    isDrawingFilter: isDrawingFilter(state),
    openTooltips: getOpenTooltips(state),
    geoFieldNames: getGeoFieldNames(state),
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
  };
}

const connectedTooltipControl = connect(mapStateToProps, mapDispatchToProps)(TooltipControl);
export { connectedTooltipControl as TooltipControl };
