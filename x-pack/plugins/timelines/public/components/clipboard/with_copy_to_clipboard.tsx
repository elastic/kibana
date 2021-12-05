/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TooltipWithKeyboardShortcut } from '../tooltip_with_keyboard_shortcut';
import { Clipboard } from '.';

export const COPY_TO_CLIPBOARD = i18n.translate('xpack.timelines.copyToClipboardTooltip', {
  defaultMessage: 'Copy to Clipboard',
});

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = React.memo<{
  isHoverAction?: boolean;
  keyboardShortcut?: string;
  showTooltip?: boolean;
  text: string;
  titleSummary?: string;
}>(({ isHoverAction, keyboardShortcut = '', showTooltip = true, text, titleSummary }) => {
  return showTooltip ? (
    <EuiToolTip
      content={
        <TooltipWithKeyboardShortcut
          additionalScreenReaderOnlyContext={text}
          content={COPY_TO_CLIPBOARD}
          shortcut={keyboardShortcut}
          showShortcut={keyboardShortcut !== ''}
        />
      }
    >
      <Clipboard
        content={text}
        isHoverAction={isHoverAction}
        titleSummary={titleSummary}
        toastLifeTimeMs={800}
      />
    </EuiToolTip>
  ) : (
    <Clipboard
      content={text}
      isHoverAction={isHoverAction}
      titleSummary={titleSummary}
      toastLifeTimeMs={800}
    />
  );
});

WithCopyToClipboard.displayName = 'WithCopyToClipboard';
