/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { ChromeHelpMenuActions } from '@kbn/core/public';
import { useDispatch } from 'react-redux';
import { HelpMenu as Component } from './help_menu.component';
import { setKeyboardShortcutsDocVisibility } from '../../state/actions/flyouts';

interface Props {
  hideHelpMenu: ChromeHelpMenuActions['hideHelpMenu'];
}

export const HelpMenu: FC<Props> = (props) => {
  const dispatch = useDispatch();
  const showKeyboardShortcutsDocFlyout = useCallback(
    () => dispatch(setKeyboardShortcutsDocVisibility(true)),
    [dispatch]
  );

  return <Component {...props} showKeyboardShortcutsDocFlyout={showKeyboardShortcutsDocFlyout} />;
};
