/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiText } from '@elastic/eui';

export function ChatItemActions({
  canCopy,
  canEdit,
  collapsed,
  editing,
  expanded,
  onToggleEdit,
  onToggleExpand,
  onCopyToClipboard,
}: {
  canCopy: boolean;
  canEdit: boolean;
  collapsed: boolean;
  editing: boolean;
  expanded: boolean;
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

  return (
    <>
      {canEdit ? (
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.observabilityAiAssistant.chatTimeline.actions.editPrompt',
            {
              defaultMessage: 'Edit prompt',
            }
          )}
          color="text"
          data-test-subj="observabilityAiAssistantChatItemActionsEditPromptButton"
          display={editing ? 'fill' : 'empty'}
          iconType="documentEdit"
          onClick={onToggleEdit}
        />
      ) : null}

      {collapsed ? (
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.observabilityAiAssistant.chatTimeline.actions.inspectPrompt',
            {
              defaultMessage: 'Inspect prompt',
            }
          )}
          color="text"
          data-test-subj="observabilityAiAssistantChatItemActionsInspectPromptButton"
          display={expanded ? 'fill' : 'empty'}
          iconType={expanded ? 'eyeClosed' : 'eye'}
          onClick={onToggleExpand}
        />
      ) : null}

      {canCopy ? (
        <EuiPopover
          button={
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.observabilityAiAssistant.chatTimeline.actions.copyMessage',
                {
                  defaultMessage: 'Copy message',
                }
              )}
              color="text"
              data-test-subj="observabilityAiAssistantChatItemActionsCopyMessageButton"
              iconType="copyClipboard"
              display={isPopoverOpen === 'copy' ? 'fill' : 'empty'}
              onClick={() => {
                setIsPopoverOpen('copy');
                onCopyToClipboard();
              }}
            />
          }
          isOpen={isPopoverOpen === 'copy'}
          panelPaddingSize="s"
          closePopover={() => setIsPopoverOpen(undefined)}
        >
          <EuiText size="s">
            {i18n.translate(
              'xpack.observabilityAiAssistant.chatTimeline.actions.copyMessageSuccessful',
              {
                defaultMessage: 'Copied message',
              }
            )}
          </EuiText>
        </EuiPopover>
      ) : null}
    </>
  );
}
