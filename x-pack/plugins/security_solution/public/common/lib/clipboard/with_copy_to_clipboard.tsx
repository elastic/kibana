/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { TooltipWithKeyboardShortcut } from '../../components/accessibility/tooltip_with_keyboard_shortcut';
import * as i18n from '../../components/drag_and_drop/translations';

import { Clipboard } from './clipboard';

const WithCopyToClipboardContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  user-select: text;
`;

WithCopyToClipboardContainer.displayName = 'WithCopyToClipboardContainer';

/**
 * Renders `children` with an adjacent icon that when clicked, copies `text` to
 * the clipboard and displays a confirmation toast
 */
export const WithCopyToClipboard = React.memo<{
  keyboardShortcut?: string;
  text: string;
  titleSummary?: string;
}>(({ keyboardShortcut = '', text, titleSummary, children }) => (
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
    <WithCopyToClipboardContainer>
      <>{children}</>
      <Clipboard content={text} titleSummary={titleSummary} toastLifeTimeMs={800} />
    </WithCopyToClipboardContainer>
  </EuiToolTip>
));

WithCopyToClipboard.displayName = 'WithCopyToClipboard';
