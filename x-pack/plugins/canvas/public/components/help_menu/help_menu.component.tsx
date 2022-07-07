/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, lazy, Suspense, useCallback } from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeHelpMenuActions } from '@kbn/core/public';
import { ExpressionFunction } from '@kbn/expressions-plugin';
import { CanvasPluginServices } from '../../services';

let FunctionReferenceGenerator: null | React.LazyExoticComponent<any> = null;

if (process.env.NODE_ENV === 'development') {
  FunctionReferenceGenerator = lazy(() =>
    import('../function_reference_generator').then((module) => ({
      default: module.FunctionReferenceGenerator,
    }))
  );
}

const strings = {
  getKeyboardShortcutsLinkLabel: () =>
    i18n.translate('xpack.canvas.helpMenu.keyboardShortcutsLinkLabel', {
      defaultMessage: 'Keyboard shortcuts',
    }),
};

interface Props {
  functionRegistry: Record<string, ExpressionFunction>;
  notifyService: CanvasPluginServices['notify'];
  showKeyboardShortcutsDocFlyout: () => void;
  hideHelpMenu: ChromeHelpMenuActions['hideHelpMenu'];
}

export const HelpMenu: FC<Props> = ({
  functionRegistry,
  notifyService,
  hideHelpMenu,
  showKeyboardShortcutsDocFlyout,
}) => {
  const onKeyboardShortcutButtonClick = useCallback(() => {
    hideHelpMenu();
    showKeyboardShortcutsDocFlyout();
  }, [hideHelpMenu, showKeyboardShortcutsDocFlyout]);

  return (
    <>
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType="keyboardShortcut"
        onClick={onKeyboardShortcutButtonClick}
      >
        {strings.getKeyboardShortcutsLinkLabel()}
      </EuiButtonEmpty>

      {FunctionReferenceGenerator ? (
        <Suspense fallback={null}>
          <EuiSpacer size="xs" />
          <FunctionReferenceGenerator
            functionRegistry={functionRegistry}
            notifyService={notifyService}
          />
        </Suspense>
      ) : null}
    </>
  );
};
