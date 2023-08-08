/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiAccordion,
  EuiComment,
  EuiErrorBoundary,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ChatItemActions } from './chat_item_actions';
import { ChatItemAvatar } from './chat_item_avatar';
import { ChatItemContentInlinePromptEditor } from './chat_item_content_inline_prompt_editor';
import { ChatItemControls } from './chat_item_controls';
import { ChatTimelineItem } from './chat_timeline';
import { getRoleTranslation } from '../../utils/get_role_translation';
import type { Feedback } from '../feedback_buttons';

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
  const accordionId = useGeneratedHtmlId({ prefix: 'chat' });

  const [editing, setEditing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(element));

  const actions = [canCopy, collapsed, canCopy].filter(Boolean);

  const noBodyMessageClassName = css`
    .euiCommentEvent__body {
      padding: 0;
      height: ${isExpanded ? 'fit-content' : '0px'};
      overflow: hidden;
    }
  `;

  const handleAccordionToggle = () => {
    setIsExpanded(!isExpanded);

    if (editing) {
      setEditing(false);
    }
  };

  const handleToggleEdit = () => {
    if (collapsed) {
      setIsExpanded(false);
    }
    setEditing(!editing);
  };

  const handleInlineEditSubmit = (newPrompt: string) => {
    handleToggleEdit();
    onEditSubmit(newPrompt);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content || '');
  };

  let contentElement: React.ReactNode =
    content || error ? (
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
        forceState={isExpanded ? 'open' : 'closed'}
        onToggle={handleAccordionToggle}
      >
        <EuiSpacer size="s" />
        {contentElement}
      </EuiAccordion>
    );
  }

  return (
    <EuiComment
      timelineAvatar={
        <ChatItemAvatar loading={loading && !content} currentUser={currentUser} role={role} />
      }
      username={getRoleTranslation(role)}
      event={title}
      actions={
        <ChatItemActions
          canCopy={canCopy}
          collapsed={collapsed}
          canEdit={canEdit}
          isCollapsed={isExpanded}
          onAccordionToggle={handleAccordionToggle}
          onCopyToClipboard={handleCopyToClipboard}
          onToggleEdit={handleToggleEdit}
        />
      }
      className={
        actions.length === 0 && !content
          ? noPanelMessageClassName
          : collapsed
          ? noBodyMessageClassName
          : normalMessageClassName
      }
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        {element ? <EuiErrorBoundary>{element}</EuiErrorBoundary> : null}

        {contentElement}
      </EuiPanel>

      <ChatItemControls
        canGiveFeedback={canGiveFeedback}
        canRegenerate={canRegenerate}
        error={error}
        loading={loading}
        onFeedbackClick={onFeedbackClick}
        onRegenerateClick={onRegenerateClick}
        onStopGeneratingClick={onStopGeneratingClick}
      />
    </EuiComment>
  );
}
