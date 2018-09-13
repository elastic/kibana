/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState, withHandlers } from 'recompose';
import { ContextMenu as Component } from './context_menu';
import { onKeyDownProvider, onKeyPressProvider } from './key_handlers';

export const ContextMenu = compose(
  withState('isOpen', 'setIsOpen', true),
  withState('selectedIndex', 'setSelectedIndex', -1),
  withHandlers({
    onKeyDown: onKeyDownProvider,
    onKeyPress: onKeyPressProvider,
  })
)(Component);
