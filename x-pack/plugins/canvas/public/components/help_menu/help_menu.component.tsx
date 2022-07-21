/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeHelpMenuActions } from '@kbn/core/public';

const strings = {
  getKeyboardShortcutsLinkLabel: () =>
    i18n.translate('xpack.canvas.helpMenu.keyboardShortcutsLinkLabel', {
      defaultMessage: 'Keyboard shortcuts',
    }),
};

interface Props {
  showKeyboardShortcutsDocFlyout: () => void;
  hideHelpMenu: ChromeHelpMenuActions['hideHelpMenu'];
}

export const HelpMenu: FC<Props> = ({ hideHelpMenu, showKeyboardShortcutsDocFlyout }) => {
  const onKeyboardShortcutButtonClick = useCallback(() => {
    hideHelpMenu();
    showKeyboardShortcutsDocFlyout();
  }, [hideHelpMenu, showKeyboardShortcutsDocFlyout]);

  return (
    <>
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType="keyboard"
        onClick={onKeyboardShortcutButtonClick}
      >
        {strings.getKeyboardShortcutsLinkLabel()}
      </EuiButtonEmpty>
    </>
  );
};
