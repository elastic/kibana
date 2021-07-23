/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { stopPropagationAndPreventDefault } from '../../../../common';
import { WithCopyToClipboard } from '../../clipboard/with_copy_to_clipboard';
import { HoverActionComponentProps } from './types';
import { COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME } from '../../clipboard';

export const FIELD = i18n.translate('xpack.timelines.hoverActions.fieldLabel', {
  defaultMessage: 'Field',
});

export const COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT = 'c';

export interface CopyProps extends HoverActionComponentProps {
  isHoverAction?: boolean;
}

const CopyButton: React.FC<CopyProps> = React.memo(
  ({ field, isHoverAction, keyboardEvent, ownFocus, value }) => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        const copyToClipboardButton = panelRef.current?.querySelector<HTMLButtonElement>(
          `.${COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME}`
        );
        if (copyToClipboardButton != null) {
          copyToClipboardButton.click();
        }
      }
    }, [keyboardEvent, ownFocus]);
    return (
      <div ref={panelRef}>
        <WithCopyToClipboard
          data-test-subj="copy-to-clipboard"
          isHoverAction={isHoverAction}
          keyboardShortcut={ownFocus ? COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT : ''}
          text={`${field}${value != null ? `: "${value}"` : ''}`}
          titleSummary={FIELD}
        />
      </div>
    );
  }
);

CopyButton.displayName = 'CopyButton';

// eslint-disable-next-line import/no-default-export
export { CopyButton as default };
