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
import { Message } from '../../../common';
import { FailedToLoadResponse } from '../message_panel/failed_to_load_response';
import { ChatActionClickHandler } from './types';

export interface ChatItemProps extends ChatTimelineItem {
  onEditSubmit: (message: Message) => void;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onStopGeneratingClick: () => void;
  onActionClick: ChatActionClickHandler;
}

const normalMessageClassName = css`
  .euiCommentEvent__header {
    padding: 4px 8px;
  }

  .euiCommentEvent__body {
    padding: 0;
  }
  /* targets .*euiTimelineItemEvent-top, makes sure text properly wraps and doesn't overflow */
  > :last-child {
    overflow-x: hidden;
  }
`;

const noPanelMessageClassName = css`
  .euiCommentEvent {
    border: none;
  }

  .euiCommentEvent__header {
    background: transparent;
    border-block-end: none;
  }

  .euiCommentEvent__body {
    display: none;
  }
`;

export function ChatItem({
  actions: { canCopy, canEdit, canGiveFeedback, canRegenerate },
  display: { collapsed },
  message: {
    message: { function_call: functionCall, role },
  },
  content,
  currentUser,
  element,
  error,
  loading,
  title,
  onEditSubmit,
  onFeedbackClick,
  onRegenerateClick,
  onStopGeneratingClick,
  onActionClick,
}: ChatItemProps) {
  const accordionId = useGeneratedHtmlId({ prefix: 'chat' });

  const [editing, setEditing] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(Boolean(element));

  const actions = [canCopy, collapsed, canCopy].filter(Boolean);

  const noBodyMessageClassName = css`
    .euiCommentEvent__header {
      padding: 4px 8px;
    }

    .euiCommentEvent__body {
      padding: 0;
      height: ${expanded ? 'fit-content' : '0px'};
      overflow: hidden;
    }
  `;

  const handleToggleExpand = () => {
    setExpanded(!expanded);

    if (editing) {
      setEditing(false);
    }
  };

  const handleToggleEdit = () => {
    if (collapsed && !expanded) {
      setExpanded(true);
    }
    setEditing(!editing);
  };

  const handleInlineEditSubmit = (message: Message) => {
    handleToggleEdit();
    return onEditSubmit(message);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content || '');
  };

  let contentElement: React.ReactNode =
    content || loading || error ? (
      <ChatItemContentInlinePromptEditor
        content={content}
        editing={editing}
        functionCall={functionCall}
        loading={loading}
        onSubmit={handleInlineEditSubmit}
        onActionClick={onActionClick}
      />
    ) : null;

  if (collapsed) {
    contentElement = (
      <EuiAccordion
        id={accordionId}
        arrowDisplay="none"
        forceState={expanded ? 'open' : 'closed'}
        onToggle={handleToggleExpand}
      >
        <EuiSpacer size="s" />
        {contentElement}
      </EuiAccordion>
    );
  }

  return (
    <EuiComment
      timelineAvatar={<ChatItemAvatar loading={loading} currentUser={currentUser} role={role} />}
      username={getRoleTranslation(role)}
      event={title}
      actions={
        <ChatItemActions
          canCopy={canCopy}
          canEdit={canEdit}
          collapsed={collapsed}
          editing={editing}
          expanded={expanded}
          onCopyToClipboard={handleCopyToClipboard}
          onToggleEdit={handleToggleEdit}
          onToggleExpand={handleToggleExpand}
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
        {error ? <FailedToLoadResponse /> : null}
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
