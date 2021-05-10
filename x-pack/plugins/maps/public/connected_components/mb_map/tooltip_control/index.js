/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
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
} from '../../../selectors/map_selectors';
import { getDrawMode } from '../../../selectors/ui_selectors';
import { DRAW_MODE } from '../../../../common';

function mapStateToProps(state = {}) {
  return {
    layerList: getLayerList(state),
    hasLockedTooltips: getHasLockedTooltips(state),
    filterModeActive: getDrawMode(state) === DRAW_MODE.DRAW_FILTERS,
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
