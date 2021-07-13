/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { WithCopyToClipboard } from '../../../lib/clipboard/with_copy_to_clipboard';
import { COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

export const FIELD = i18n.translate('xpack.securitySolution.hoverActions.fieldLabel', {
  defaultMessage: 'Field',
});

interface Props {
  field: string;
  isHoverAction?: boolean;
  ownFocus: boolean;
  value?: string[] | string | null;
}

export const CopyButton: React.FC<Props> = React.memo(
  ({ isHoverAction, field, ownFocus, value }) => {
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
