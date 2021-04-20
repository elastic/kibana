/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { MapStoreState } from '../../reducers/store';
import { getDrawMode, getFlyoutDisplay } from '../../selectors/ui_selectors';
import { FLYOUT_STATE } from '../../reducers/ui';
import { getLayersBySourceType } from '../../selectors/map_selectors';
import { SOURCE_TYPES } from '../../../common';

function mapStateToProps(state: MapStoreState) {
  return {
    showEditButton: !!getLayersBySourceType(SOURCE_TYPES.ES_SEARCH, state).length,
    addDrawLayerInProgress:
      getFlyoutDisplay(state) !== FLYOUT_STATE.NONE && state.map.mapState.editModeActive,
    drawMode: getDrawMode(state),
  };
}

const connected = connect(mapStateToProps, null)(ToolbarOverlay);
export { connected as ToolbarOverlay };
