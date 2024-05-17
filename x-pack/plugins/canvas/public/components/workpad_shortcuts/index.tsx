/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import { compose, withHandlers } from 'react-recompose';
import {
  Props as HandlerCreatorProps,
  basicHandlerCreators,
  clipboardHandlerCreators,
  groupHandlerCreators,
  layerHandlerCreators,
  positionHandlerCreators,
} from '../../lib/element_handler_creators';
import { WorkpadShortcuts as Component, Props as WorkpadShortcutsProps } from './workpad_shortcuts';

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
