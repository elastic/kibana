/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { css } from '@emotion/css';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { ChatItem } from './chat_item';
import { ChatWelcomePanel } from './chat_welcome_panel';
import { ChatConsolidatedItems } from './chat_consolidated_items';
import type { Feedback } from '../feedback_buttons';
import { type Message } from '../../../common';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import type { ChatActionClickHandler } from './types';

export interface ChatTimelineItem
  extends Pick<Message['message'], 'role' | 'content' | 'function_call'> {
  id: string;
  title: ReactNode;
  actions: {
    canCopy: boolean;
    canEdit: boolean;
    canGiveFeedback: boolean;
    canRegenerate: boolean;
  };
  display: {
    collapsed: boolean;
    hide?: boolean;
  };
  loading: boolean;
  element?: React.ReactNode;
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  error?: any;
}

export interface ChatTimelineProps {
  items: Array<ChatTimelineItem | ChatTimelineItem[]>;
  knowledgeBase: UseKnowledgeBaseResult;
  onEdit: (item: ChatTimelineItem, message: Message) => Promise<void>;
  onFeedback: (item: ChatTimelineItem, feedback: Feedback) => void;
  onRegenerate: (item: ChatTimelineItem) => void;
  onStopGenerating: () => void;
  onActionClick: ChatActionClickHandler;
}

export function ChatTimeline({
  items = [],
  knowledgeBase,
  onEdit,
  onFeedback,
  onRegenerate,
  onStopGenerating,
  onActionClick,
}: ChatTimelineProps) {
  return (
    <EuiCommentList
      css={css`
        padding-bottom: 32px;
      `}
    >
      {items.length <= 1 ? (
        <ChatWelcomePanel knowledgeBase={knowledgeBase} />
      ) : (
        items.map((item, index) =>
          Array.isArray(item) ? (
            <ChatConsolidatedItems
              key={index}
              consolidatedItem={item}
              onFeedback={onFeedback}
              onRegenerate={onRegenerate}
              onEditSubmit={onEdit}
              onStopGenerating={onStopGenerating}
              onActionClick={onActionClick}
            />
          ) : (
            <ChatItem
              // use index, not id to prevent unmounting of component when message is persisted
              key={index}
              {...item}
              onFeedbackClick={(feedback) => {
                onFeedback(item, feedback);
              }}
              onRegenerateClick={() => {
                onRegenerate(item);
              }}
              onEditSubmit={(message) => onEdit(item, message)}
              onStopGeneratingClick={onStopGenerating}
              onActionClick={onActionClick}
            />
          )
        )
      )}
    </EuiCommentList>
  );
}
