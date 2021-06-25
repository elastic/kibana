/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';

import React from 'react';

import { TooltipWithKeyboardShortcut } from '../../components/accessibility';
import * as i18n from '../../components/drag_and_drop/translations';

import { Clipboard } from './clipboard';

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = React.memo<{
  keyboardShortcut?: string;
  text: string;
  titleSummary?: string;
}>(({ keyboardShortcut = '', text, titleSummary }) => (
  <EuiToolTip
    content={
      <TooltipWithKeyboardShortcut
        additionalScreenReaderOnlyContext={text}
        content={i18n.COPY_TO_CLIPBOARD}
        shortcut={keyboardShortcut}
        showShortcut={keyboardShortcut !== ''}
      />
    }
  >
    <Clipboard content={text} titleSummary={titleSummary} toastLifeTimeMs={800} />
  </EuiToolTip>
));

WithCopyToClipboard.displayName = 'WithCopyToClipboard';
