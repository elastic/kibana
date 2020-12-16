/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiScreenReaderOnly, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  additionalScreenReaderOnlyContext?: string;
  content: React.ReactNode;
  shortcut: string;
  showShortcut: boolean;
}

const TooltipWithKeyboardShortcutComponent = ({
  additionalScreenReaderOnlyContext = '',
  content,
  shortcut,
  showShortcut,
}: Props) => (
  <>
    <div>{content}</div>
    {additionalScreenReaderOnlyContext !== '' && (
      <EuiScreenReaderOnly>
        <p>{additionalScreenReaderOnlyContext}</p>
      </EuiScreenReaderOnly>
    )}
    {showShortcut && (
      <EuiText color="subdued" size="s" textAlign="center">
        <span>{i18n.PRESS}</span>
        {'\u00a0'}
        <span className="euiBadge euiBadge--hollow">{shortcut}</span>
      </EuiText>
    )}
  </>
);

export const TooltipWithKeyboardShortcut = React.memo(TooltipWithKeyboardShortcutComponent);
TooltipWithKeyboardShortcut.displayName = 'TooltipWithKeyboardShortcut';
