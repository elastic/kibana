/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getKeyboardShortcutsDocVisibility } from '../../state/selectors/flyouts';
import { KeyboardShortcutsDocPanel as Component } from './keyboard_shortcuts_doc_panel.component';
import { State } from '../../../types';
import { setKeyboardShortcutsDocVisibility } from '../../state/actions/flyouts';

export const KeyboardShortcutsDocPanel = () => {
  const dispatch = useDispatch();
  const isVisible = useSelector<State, boolean>((state) =>
    getKeyboardShortcutsDocVisibility(state)
  );

  const hidePanel = useCallback(
    () => dispatch(setKeyboardShortcutsDocVisibility(false)),
    [dispatch]
  );

  return <Component isVisible={isVisible} hidePanel={hidePanel} />;
};
