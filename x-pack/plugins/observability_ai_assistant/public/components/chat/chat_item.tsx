/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiComment,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { MessageRole, Message } from '../../../common/types';
import { ChatItemAvatar } from './chat_item_avatar';
import { ChatItemTitle } from './chat_item_title';
import { ChatItemControls } from './chat_item_controls';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { Feedback } from '../feedback_buttons';

export interface ChatItemAction {
  id: string;
  label: string;
  icon?: string;
  handler: () => void;
}

export interface ChatItemProps {
  currentUser: AuthenticatedUser | undefined;
  dateFormat: string;
  index: number;
  isLoading: boolean;
  message: Message;
  onEditMessage?: (id: string) => void;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateMessage?: (id: string) => void;
}

export function ChatItem({
  currentUser,
  dateFormat,
  index,
  isLoading,
  message,
  onFeedbackClick,
  onEditMessage,
  onRegenerateMessage,
}: ChatItemProps) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const [isActionsPopoverOpen, setIsActionsPopover] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopover(!isActionsPopoverOpen);
  };

  const actionsMap: Record<MessageRole, ChatItemAction[]> = {
    [MessageRole.User]: [
      {
        id: 'edit',
        label: i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.editMessage', {
          defaultMessage: 'Edit message',
        }),
        handler: () => {
          onEditMessage?.(message['@timestamp']);
          setIsActionsPopover(false);
        },
      },
    ],
    [MessageRole.Function]: [
      {
        id: 'edit',
        label: i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.editFunction', {
          defaultMessage: 'Edit function',
        }),
        handler: () => {
          onEditMessage?.(message['@timestamp']);
          setIsActionsPopover(false);
        },
      },
    ],
    [MessageRole.Assistant]: [
      {
        id: 'copy',
        label: i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.copyMessage', {
          defaultMessage: 'Copy message',
        }),
        handler: message.message.content
          ? async () => {
              try {
                await navigator.clipboard.writeText(message.message.content || '');
                toasts.addSuccess(
                  i18n.translate(
                    'xpack.observabilityAiAssistant.chatTimeline.actions.copyMessageSuccess',
                    {
                      defaultMessage: 'Copied to clipboard',
                    }
                  )
                );
                setIsActionsPopover(false);
              } catch (error) {
                toasts.addError(
                  error,
                  i18n.translate(
                    'xpack.observabilityAiAssistant.chatTimeline.actions.copyMessageError',
                    {
                      defaultMessage: 'Error while copying to clipboard',
                    }
                  )
                );
                setIsActionsPopover(false);
              }
            }
          : noop,
      },
      {
        id: 'regenerate',
        label: i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.regenerate', {
          defaultMessage: 'Regenerate response',
        }),
        handler: () => {
          onRegenerateMessage?.(message['@timestamp']);
          setIsActionsPopover(false);
        },
      },
    ],
    [MessageRole.System]: [],
    [MessageRole.Event]: [],
    [MessageRole.Elastic]: [],
  };

  const canReceiveFeedback = [
    MessageRole.Assistant,
    MessageRole.Elastic,
    MessageRole.Function,
  ].includes(message.message.role);

  const canRegenerateResponse = message.message.role === MessageRole.Assistant;

  return (
    <EuiComment
      key={message['@timestamp']}
      event={
        <ChatItemTitle
          actionsTrigger={
            actionsMap[message.message.role].length ? (
              <EuiPopover
                anchorPosition="downLeft"
                button={
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.observabilityAiAssistant.chatTimeline.actions',
                      {
                        defaultMessage: 'Actions',
                      }
                    )}
                    color="text"
                    display="empty"
                    iconType="boxesHorizontal"
                    size="s"
                    onClick={handleClickActions}
                  />
                }
                panelPaddingSize="s"
                closePopover={handleClickActions}
                isOpen={isActionsPopoverOpen}
              >
                <EuiContextMenuPanel
                  size="s"
                  items={actionsMap[message.message.role]?.map(({ id, icon, label, handler }) => (
                    <EuiContextMenuItem key={id} icon={icon} onClick={handler}>
                      {label}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            ) : null
          }
          message={message}
          index={index}
          dateFormat={dateFormat}
        />
      }
      timelineAvatar={<ChatItemAvatar currentUser={currentUser} role={message.message.role} />}
      username={getRoleTranslation(message.message.role)}
    >
      {message.message.content ? (
        <MessagePanel
          body={<MessageText content={message.message.content} loading={isLoading} />}
          controls={
            canReceiveFeedback || canRegenerateResponse ? (
              <ChatItemControls
                role={message.message.role}
                onFeedbackClick={onFeedbackClick}
                canReceiveFeedback={canReceiveFeedback}
                canRegenerateResponse={canRegenerateResponse}
                onRegenerateClick={() => onRegenerateMessage?.(message['@timestamp'])}
              />
            ) : null
          }
        />
      ) : null}
    </EuiComment>
  );
}

const getRoleTranslation = (role: MessageRole) => {
  if (role === MessageRole.User) {
    return i18n.translate('xpack.observabilityAiAssistant.chatTimeline.messages.user.label', {
      defaultMessage: 'You',
    });
  }

  if (role === MessageRole.System) {
    return i18n.translate('xpack.observabilityAiAssistant.chatTimeline.messages.system.label', {
      defaultMessage: 'System',
    });
  }

  return i18n.translate(
    'xpack.observabilityAiAssistant.chatTimeline.messages.elasticAssistant.label',
    {
      defaultMessage: 'Elastic Assistant',
    }
  );
};
