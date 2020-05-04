/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TooltipControl } from './tooltip_control';
import {
  closeOnClickTooltip,
  openOnClickTooltip,
  closeOnHoverTooltip,
  openOnHoverTooltip,
} from '../../../../actions/map_actions';
import {
  getLayerList,
  getOpenTooltips,
  getHasLockedTooltips,
  isDrawingFilter,
} from '../../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    layerList: getLayerList(state),
    hasLockedTooltips: getHasLockedTooltips(state),
    isDrawingFilter: isDrawingFilter(state),
    openTooltips: getOpenTooltips(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeOnClickTooltip(tooltipId) {
      dispatch(closeOnClickTooltip(tooltipId));
    },
    openOnClickTooltip(tooltipState) {
      dispatch(openOnClickTooltip(tooltipState));
    },
    closeOnHoverTooltip() {
      dispatch(closeOnHoverTooltip());
    },
    openOnHoverTooltip(tooltipState) {
      dispatch(openOnHoverTooltip(tooltipState));
    },
  };
}

const connectedTooltipControl = connect(mapStateToProps, mapDispatchToProps)(TooltipControl);
export { connectedTooltipControl as TooltipControl };
