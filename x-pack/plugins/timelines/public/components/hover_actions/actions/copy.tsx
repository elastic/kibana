/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { WithCopyToClipboard } from '../../clipboard/with_copy_to_clipboard';
import { HoverActionComponentProps } from './types';

export const FIELD = i18n.translate('xpack.timelines.hoverActions.fieldLabel', {
  defaultMessage: 'Field',
});

export const COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT = 'c';

export type CopyProps = Omit<HoverActionComponentProps, 'onClick'> & {
  isHoverAction?: boolean;
};

export const CopyButton: React.FC<CopyProps> = React.memo(
  ({ field, isHoverAction, ownFocus, value }) => {
    return (
      <WithCopyToClipboard
        data-test-subj="copy-to-clipboard"
        isHoverAction={isHoverAction}
        keyboardShortcut={ownFocus ? COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT : ''}
        text={`${field}${value != null ? `: "${value}"` : ''}`}
        titleSummary={FIELD}
      />
    );
  }
);

CopyButton.displayName = 'CopyButton';
