/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiComment,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
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
  icon: string;
  handler: () => void;
}

export interface ChatItemProps extends ChatTimelineItem {
  onEditSubmit: (content: string) => void;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onStopGeneratingClick: () => void;
}

const euiCommentClassName = css`
  .euiCommentEvent__headerEvent {
    flex-grow: 1;
  }

  > div:last-child {
    overflow: hidden;
  }
`;

const systemMessageClassName = css`
  .euiCommentEvent__header {
    background: transparent;
    border-block-end: none;
  }

  .euiCommentEvent {
    border: none;
  }
`;

const accordionButtonClassName = css`
  .euiAccordion__iconButton {
    display: none;
  }
`;

export function ChatItem({
  title,
  content,
  canCopy,
  canEdit,
  canGiveFeedback,
  canRegenerate,
  canExpand,
  role,
  loading,
  error,
  currentUser,
  onEditSubmit,
  onRegenerateClick,
  onStopGeneratingClick,
  onFeedbackClick,
}: ChatItemProps) {
  const accordionId = useGeneratedHtmlId({ prefix: 'chat' });

  const [isPopoverOpen, setIsPopoverOpen] = useState<string | undefined>();
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  const handleAccordionToggle = () => {
    setIsAccordionOpen(!isAccordionOpen);
  };

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
            label: i18n.translate(
              'xpack.observabilityAiAssistant.chatTimeline.actions.editMessage',
              {
                defaultMessage: 'Edit message',
              }
            ),
            handler: () => {
              onEditSubmit(content || '');
            },
          },
        ]
      : []),
    ...(canExpand
      ? [
          {
            id: 'expand',
            icon: isAccordionOpen ? 'eyeClosed' : 'eye',
            label: isAccordionOpen
              ? i18n.translate('xpack.observabilityAiAssistant.chatTimeline.actions.inspect', {
                  defaultMessage: 'Inspect message',
                })
              : '',
            handler: () => {
              handleAccordionToggle();
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
              navigator.clipboard.writeText(content || '');
            },
          },
        ]
      : []),
  ];

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
          actions={actions.map(({ id, icon, label, handler }) =>
            label ? (
              <EuiPopover
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
          title={title}
        />
      }
      className={role === MessageRole.System ? systemMessageClassName : euiCommentClassName}
      timelineAvatar={
        <ChatItemAvatar loading={loading && !content} currentUser={currentUser} role={role} />
      }
      username={getRoleTranslation(role)}
    >
      {content || error || controls ? (
        <MessagePanel
          body={
            content || loading ? (
              role === MessageRole.System ? (
                <EuiAccordion
                  id={accordionId}
                  className={accordionButtonClassName}
                  forceState={isAccordionOpen ? 'open' : 'closed'}
                  onToggle={handleAccordionToggle}
                >
                  <EuiSpacer size="s" />
                  <MessageText content={content || ''} loading={loading} />
                </EuiAccordion>
              ) : (
                <MessageText content={content || ''} loading={loading} />
              )
            ) : null
          }
          controls={controls}
          error={error}
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
