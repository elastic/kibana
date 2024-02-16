/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { WorkpadShortcuts as Component, Props as WorkpadShortcutsProps } from './workpad_shortcuts';
import {
  groupHandlerCreators,
  layerHandlerCreators,
  basicHandlerCreators,
  clipboardHandlerCreators,
  positionHandlerCreators,
} from '../../lib/element_handler_creators';
import { createHandlers } from '../sidebar_header/sidebar_header';

export const WorkpadShortcuts = (props: WorkpadShortcutsProps) => {
  const groupHandlers = createHandlers(groupHandlerCreators, { ...props });
  const layerHandlers = createHandlers(layerHandlerCreators, { ...props });
  const basicHandlers = createHandlers(basicHandlerCreators, { ...props });
  const clipboardHandlers = createHandlers(clipboardHandlerCreators, { ...props });
  const positionHandlers = createHandlers(positionHandlerCreators, { ...props });

  return (
    <Component
      {...groupHandlers}
      {...layerHandlers}
      {...basicHandlers}
      {...clipboardHandlers}
      {...positionHandlers}
    />
  );
};

WorkpadShortcuts.propTypes = {
  pageId: PropTypes.string.isRequired,
  selectedNodes: PropTypes.arrayOf(PropTypes.object),
  elementLayer: PropTypes.func.isRequired,
  insertNodes: PropTypes.func.isRequired,
  removeNodes: PropTypes.func.isRequired,
  selectToplevelNodes: PropTypes.func.isRequired,
  commit: PropTypes.func.isRequired,
};
