/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { withHandlers, compose } from 'recompose';
import { WorkpadShortcuts as Component, Props as WorkpadShortcutsProps } from './workpad_shortcuts';
import {
  groupHandlerCreators,
  layerHandlerCreators,
  basicHandlerCreators,
  clipboardHandlerCreators,
  Props as HandlerCreatorProps,
  positionHandlerCreators,
} from '../../lib/element_handler_creators';

export const WorkpadShortcuts = compose<WorkpadShortcutsProps, HandlerCreatorProps>(
  withHandlers(groupHandlerCreators),
  withHandlers(layerHandlerCreators),
  withHandlers(basicHandlerCreators),
  withHandlers(clipboardHandlerCreators),
  withHandlers(positionHandlerCreators)
)(Component);

WorkpadShortcuts.propTypes = {
  pageId: PropTypes.string.isRequired,
  selectedNodes: PropTypes.arrayOf(PropTypes.object),
  elementLayer: PropTypes.func.isRequired,
  insertNodes: PropTypes.func.isRequired,
  removeNodes: PropTypes.func.isRequired,
  selectToplevelNodes: PropTypes.func.isRequired,
  commit: PropTypes.func.isRequired,
};
