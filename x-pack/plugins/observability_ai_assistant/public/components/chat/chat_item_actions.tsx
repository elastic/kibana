/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';

export interface ChatItemAction {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

export function ChatItemActions({
  canEdit,
  collapsed,
  canCopy,
  isCollapsed,
  onToggleEdit,
  onToggleExpand,
  onCopyToClipboard,
}: {
  canEdit: boolean;
  collapsed: boolean;
  canCopy: boolean;
  isCollapsed: boolean;
  onToggleEdit: () => void;
  onToggleExpand: () => void;
  onCopyToClipboard: () => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<string | undefined>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isPopoverOpen) {
        setIsPopoverOpen(undefined);
      }
    }, 800);

    return () => {
      clearTimeout(timeout);
    };
  }, [isPopoverOpen]);

  const actions: ChatItemAction[] = [
    ...(canEdit
      ? [
          {
            id: 'edit',
            icon: 'documentEdit',
            label: '',
            handler: () => {
              onToggleEdit();
            },
          },
        ]
      : []),
    ...(collapsed
      ? [
          {
            id: 'expand',
            icon: isCollapsed ? 'eyeClosed' : 'eye',
            label: '',
            handler: () => {
              onToggleExpand();
            },
          },
        ]
      : []),
    ...(canCopy
      ? [
          {
            id: 'copy',
            icon: 'copyClipboard',
            label: i18n.translate(
              'xpack.observabilityAiAssistant.chatTimeline.actions.copyMessage',
              {
                defaultMessage: 'Copied message',
              }
            ),
            handler: () => {
              onCopyToClipboard();
            },
          },
        ]
      : []),
  ];
  return (
    <>
      {actions.map(({ id, icon, label, handler }) =>
        label ? (
          <EuiPopover
            key={id}
            button={
              <EuiButtonIcon
                aria-label={label}
                key={id}
                iconType={icon}
                onClick={() => {
                  setIsPopoverOpen(id);
                  handler();
                }}
                color="text"
              />
            }
            isOpen={isPopoverOpen === id}
            closePopover={() => setIsPopoverOpen(undefined)}
            panelPaddingSize="s"
          >
            <EuiText size="s">
              <p>{label}</p>
            </EuiText>
          </EuiPopover>
        ) : (
          <EuiButtonIcon
            aria-label={label}
            key={id}
            iconType={icon}
            onClick={handler}
            color="text"
          />
        )
      )}
    </>
  );
}
