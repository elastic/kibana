/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { css } from '@emotion/css';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiComment,
  EuiFlexGroup,
  EuiErrorBoundary,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  EuiHorizontalRule,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '../../../common/types';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { ChatItemContentInlinePromptEditor } from './chat_item_content_inline_prompt_editor';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { ChatItemAvatar } from './chat_item_avatar';
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

const normalMessageClassName = css`
  .euiCommentEvent__body {
    padding: 0;
  }
`;

const noPanelMessageClassName = css`
  .euiCommentEvent__header {
    background: transparent;
    border-block-end: none;
  }

  .euiCommentEvent__body {
    padding: 0;
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
  canCopy,
  canEdit,
  canGiveFeedback,
  canRegenerate,
  collapsed,
  content,
  currentUser,
  element,
  error,
  functionCall,
  loading,
  onEditSubmit,
  onFeedbackClick,
  onRegenerateClick,
  onStopGeneratingClick,
  role,
  title,
}: ChatItemProps) {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'chat' });

  const inlineEditInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<string | undefined>();
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  const noBodyMessageClassName = css`
    .euiCommentEvent__body {
      padding: 0;
      height: ${isAccordionOpen ? 'fit-content' : '0px'};
      overflow: hidden;
    }
  `;

  const handleAccordionToggle = () => {
    setIsAccordionOpen(!isAccordionOpen);

    if (editing) {
      setEditing(false);
    }
  };

  const handleToggleEdit = () => {
    if (collapsed) {
      setIsAccordionOpen(true);
    }
    setEditing(!editing);
  };

  const handleInlineEditSubmit = (newPrompt: string) => {
    handleToggleEdit();
    onEditSubmit(newPrompt);
  };

  useEffect(() => {
    if (editing) {
      inlineEditInputRef.current?.focus();
    }
  }, [editing]);

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
              handleToggleEdit();
            },
          },
        ]
      : []),
    ...(collapsed
      ? [
          {
            id: 'expand',
            icon: isAccordionOpen ? 'eyeClosed' : 'eye',
            label: '',
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
      <>
        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="none" color={euiTheme.colors.lightestShade} />
        <EuiPanel hasShadow={false} paddingSize="s">
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
        </EuiPanel>
      </>
    );
  }

  let contentElement: React.ReactNode =
    content || error || controls ? (
      <ChatItemContentInlinePromptEditor
        content={content}
        functionCall={functionCall}
        loading={loading}
        editing={editing}
        onSubmit={handleInlineEditSubmit}
      />
    ) : null;

  if (collapsed) {
    contentElement = (
      <EuiAccordion
        id={accordionId}
        className={accordionButtonClassName}
        forceState={isAccordionOpen ? 'open' : 'closed'}
        onToggle={handleAccordionToggle}
      >
        <EuiSpacer size="s" />
        {contentElement}
      </EuiAccordion>
    );
  }

  return (
    <EuiComment
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
      event={title}
      className={
        actions.length === 0 && !content
          ? noPanelMessageClassName
          : collapsed
          ? noBodyMessageClassName
          : normalMessageClassName
      }
      timelineAvatar={
        <ChatItemAvatar loading={loading && !content} currentUser={currentUser} role={role} />
      }
      username={getRoleTranslation(role)}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        {element ? <EuiErrorBoundary>{element}</EuiErrorBoundary> : null}
        {contentElement}
      </EuiPanel>
      {controls}
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
