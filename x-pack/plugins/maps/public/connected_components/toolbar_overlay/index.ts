/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { MapStoreState } from '../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    editModeActive: state.map.mapState.editModeActive,
  };
}

const connected = connect(mapStateToProps, null)(ToolbarOverlay);
export { connected as ToolbarOverlay };
