/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import copy from 'copy-to-clipboard';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { stopPropagationAndPreventDefault } from '../../../../common/utils/accessibility';
import { HoverActionComponentProps } from './types';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { COPY_TO_CLIPBOARD, SUCCESS_TOAST_TITLE } from './translations';
import { WithCopyToClipboard } from '../../clipboard/with_copy_to_clipboard';

export const FIELD = i18n.translate('xpack.timelines.hoverActions.fieldLabel', {
  defaultMessage: 'Field',
});

export const COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT = 'c';
export const COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME = 'copy-to-clipboard';

export interface CopyProps extends HoverActionComponentProps {
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  isHoverAction?: boolean;
}

const CopyButton: React.FC<CopyProps> = React.memo(
  ({ Component, field, isHoverAction, onClick, keyboardEvent, ownFocus, value }) => {
    const { addSuccess } = useAppToasts();
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
        if (onClick != null) {
          onClick();
        }
      }
    }, [onClick, keyboardEvent, ownFocus]);

    const text = useMemo(() => `${field}${value != null ? `: "${value}"` : ''}`, [field, value]);

    const handleOnClick = useCallback(() => {
      const isSuccess = copy(text, { debug: true });
      if (onClick != null) {
        onClick();
      }

      if (isSuccess) {
        addSuccess(SUCCESS_TOAST_TITLE(field), { toastLifeTimeMs: 800 });
      }
    }, [addSuccess, field, onClick, text]);

    return Component ? (
      <Component
        aria-label={COPY_TO_CLIPBOARD}
        data-test-subj="copy-to-clipboard"
        icon="copy"
        iconType="copy"
        onClick={handleOnClick}
        title={COPY_TO_CLIPBOARD}
      >
        {COPY_TO_CLIPBOARD}
      </Component>
    ) : (
      <div ref={panelRef}>
        <WithCopyToClipboard
          data-test-subj="copy-to-clipboard"
          isHoverAction={isHoverAction}
          keyboardShortcut={ownFocus ? COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT : ''}
          text={text}
          titleSummary={FIELD}
        />
      </div>
    );
  }
);

CopyButton.displayName = 'CopyButton';

// eslint-disable-next-line import/no-default-export
export { CopyButton as default };
