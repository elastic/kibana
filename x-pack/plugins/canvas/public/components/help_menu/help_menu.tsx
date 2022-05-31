/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { ExpressionFunction } from '@kbn/expressions-plugin';
import { ChromeHelpMenuActions } from '@kbn/core/public';
import { useDispatch } from 'react-redux';
import { HelpMenu as Component } from './help_menu.component';
import { CanvasPluginServices } from '../../services';
import { setKeyboardShortcutsDocVisibility } from '../../state/actions/flyouts';

interface Props {
  functionRegistry: Record<string, ExpressionFunction>;
  notifyService: CanvasPluginServices['notify'];
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
