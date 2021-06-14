/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { MapStoreState } from '../../reducers/store';
import { getGeoFieldNames } from '../../selectors/map_selectors';
import { ToolbarOverlay } from './toolbar_overlay';

function mapStateToProps(state: MapStoreState) {
  return {
    showToolsControl: getGeoFieldNames(state).length !== 0,
  };
}

const connected = connect(mapStateToProps)(ToolbarOverlay);
export { connected as ToolbarOverlay };
