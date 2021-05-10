/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { MapStoreState } from '../../reducers/store';
import { getDrawMode } from '../../selectors/ui_selectors';
import { getLayersBySourceType } from '../../selectors/map_selectors';
import { DRAW_MODE, SOURCE_TYPES } from '../../../common';

function mapStateToProps(state: MapStoreState) {
  return {
    showEditButton: !!getLayersBySourceType(SOURCE_TYPES.ES_SEARCH, state).length,
    shapeDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_SHAPES,
    pointDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_POINTS,
  };
}

const connected = connect(mapStateToProps, null)(ToolbarOverlay);
export { connected as ToolbarOverlay };
