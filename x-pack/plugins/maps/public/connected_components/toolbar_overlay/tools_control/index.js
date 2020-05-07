/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ToolsControl } from './tools_control';
import { isDrawingFilter } from '../../../selectors/map_selectors';
import { updateDrawState } from '../../../actions/map_actions';

function mapStateToProps(state = {}) {
  return {
    isDrawingFilter: isDrawingFilter(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    initiateDraw: options => {
      dispatch(updateDrawState(options));
    },
    cancelDraw: () => {
      dispatch(updateDrawState(null));
    },
  };
}

const connectedToolsControl = connect(mapStateToProps, mapDispatchToProps)(ToolsControl);
export { connectedToolsControl as ToolsControl };
