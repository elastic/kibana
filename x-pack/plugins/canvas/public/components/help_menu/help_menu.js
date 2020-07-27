/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { EuiButtonEmpty, EuiPortal, EuiSpacer } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';
import { FunctionReferenceGenerator } from '../function_reference_generator';

const { HelpMenu: strings } = ComponentStrings;

export const HelpMenu = () => {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);

  const showFlyout = () => {
    setFlyoutVisible(true);
  };

  const hideFlyout = () => {
    setFlyoutVisible(false);
  };

  const isDevelopment = !['production', 'test'].includes(process.env.NODE_ENV);

  return (
    <Fragment>
      <EuiButtonEmpty size="xs" flush="left" iconType="keyboardShortcut" onClick={showFlyout}>
        {strings.getKeyboardShortcutsLinkLabel()}
      </EuiButtonEmpty>
      {isDevelopment && (
        <Fragment>
          <EuiSpacer size="s" />
          <FunctionReferenceGenerator />
        </Fragment>
      )}
      {isFlyoutVisible && (
        <EuiPortal>
          <KeyboardShortcutsDoc onClose={hideFlyout} />
        </EuiPortal>
      )}
    </Fragment>
  );
};
