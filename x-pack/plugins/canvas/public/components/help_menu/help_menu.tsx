/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, lazy, Suspense } from 'react';
import { EuiButtonEmpty, EuiPortal, EuiSpacer } from '@elastic/eui';
import { ExpressionFunction } from 'src/plugins/expressions';
import { ComponentStrings } from '../../../i18n';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';

let FunctionReferenceGenerator: null | React.LazyExoticComponent<any> = null;
if (process.env.NODE_ENV === 'development') {
  FunctionReferenceGenerator = lazy(() =>
    import('../function_reference_generator').then((module) => ({
      default: module.FunctionReferenceGenerator,
    }))
  );
}

const { HelpMenu: strings } = ComponentStrings;

interface Props {
  functionRegistry: Record<string, ExpressionFunction>;
}

export const HelpMenu: FC<Props> = ({ functionRegistry }) => {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);

  const showFlyout = () => {
    setFlyoutVisible(true);
  };

  const hideFlyout = () => {
    setFlyoutVisible(false);
  };

  return (
    <>
      <EuiButtonEmpty size="xs" flush="left" iconType="keyboardShortcut" onClick={showFlyout}>
        {strings.getKeyboardShortcutsLinkLabel()}
      </EuiButtonEmpty>

      {FunctionReferenceGenerator ? (
        <Suspense fallback={null}>
          <EuiSpacer size="s" />
          <FunctionReferenceGenerator functionRegistry={functionRegistry} />
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
