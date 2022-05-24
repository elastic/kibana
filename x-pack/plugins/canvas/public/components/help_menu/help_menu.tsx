/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, lazy, Suspense } from 'react';
import { EuiButtonEmpty, EuiPortal, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpressionFunction } from '@kbn/expressions-plugin';

import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';
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
}

export const HelpMenu: FC<Props> = ({ functionRegistry, notifyService }) => {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);

  const showFlyout = () => {
    setFlyoutVisible(true);
  };

  const hideFlyout = () => {
    setFlyoutVisible(false);
  };

  return (
    <>
      <EuiButtonEmpty size="s" flush="left" iconType="keyboardShortcut" onClick={showFlyout}>
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

      {isFlyoutVisible && (
        <EuiPortal>
          <KeyboardShortcutsDoc onClose={hideFlyout} />
        </EuiPortal>
      )}
    </>
  );
};
