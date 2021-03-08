/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';

function mapStateToProps() {
  return {};
}

const connectedToolbarOverlay = connect(mapStateToProps, null)(ToolbarOverlay);
export { connectedToolbarOverlay as ToolbarOverlay };
