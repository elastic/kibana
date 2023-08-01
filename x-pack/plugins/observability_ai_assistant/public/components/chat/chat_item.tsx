/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiComment,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { MessageRole } from '../../../common/types';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { ChatItemAvatar } from './chat_item_avatar';
import { ChatItemTitle } from './chat_item_title';
import { ChatTimelineItem } from './chat_timeline';

export interface ChatItemAction {
  id: string;
  label: string;
  icon?: string;
  handler: () => void;
}

export interface ChatItemProps extends ChatTimelineItem {
  onEditSubmit: (content: string) => void;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onStopGeneratingClick: () => void;
}

export function ChatItem({
  title,
  content,
  canEdit,
  canGiveFeedback,
  canRegenerate,
  role,
  loading,
  error,
  currentUser,
  onEditSubmit,
  onRegenerateClick,
  onStopGeneratingClick,
  onFeedbackClick,
}: ChatItemProps) {
  const [isActionsPopoverOpen, setIsActionsPopover] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopover(!isActionsPopoverOpen);
  };

  const [_, setEditing] = useState(false);

  const actions: ChatItemAction[] = canEdit
    ? [
        {
          id: 'edit',
          label: i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.editMessage', {
            defaultMessage: 'Edit message',
          }),
          handler: () => {
            setEditing(false);
            setIsActionsPopover(false);
          },
        },
      ]
    : [];

  let controls: React.ReactNode;

  const displayFeedback = !error && canGiveFeedback;
  const displayRegenerate = !loading && canRegenerate;

  if (loading) {
    controls = <StopGeneratingButton onClick={onStopGeneratingClick} />;
  } else if (displayFeedback || displayRegenerate) {
    controls = (
      <EuiFlexGroup justifyContent="flexEnd">
        {displayFeedback ? (
          <EuiFlexItem grow={true}>
            <FeedbackButtons onClickFeedback={onFeedbackClick} />
          </EuiFlexItem>
        ) : null}
        {displayRegenerate ? (
          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
            <RegenerateResponseButton onClick={onRegenerateClick} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiComment
      event={
        <ChatItemTitle
          actionsTrigger={
            actions.length ? (
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
                  items={actions.map(({ id, icon, label, handler }) => (
                    <EuiContextMenuItem key={id} icon={icon} onClick={handler}>
                      {label}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            ) : null
          }
          title={title}
        />
      }
      timelineAvatar={<ChatItemAvatar currentUser={currentUser} role={role} />}
      username={getRoleTranslation(role)}
    >
      {content !== undefined || error || loading ? (
        <MessagePanel
          body={
            content !== undefined || loading ? (
              <MessageText content={content || ''} loading={loading} />
            ) : null
          }
          error={error}
          controls={controls}
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
