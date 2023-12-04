/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo } from 'react';
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
import {
  getTimelineItemsfromConversation,
  StartedFrom,
} from '../../utils/get_timeline_items_from_conversation';
import { ObservabilityAIAssistantChatService } from '../../types';
import { ChatState } from '../../hooks/use_chat';

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
  message: Message;
}

export interface ChatTimelineProps {
  messages: Message[];
  knowledgeBase: UseKnowledgeBaseResult;
  chatService: ObservabilityAIAssistantChatService;
  hasConnector: boolean;
  chatState: ChatState;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  startedFrom?: StartedFrom;
  onEdit: (message: Message, messageAfterEdit: Message) => void;
  onFeedback: (message: Message, feedback: Feedback) => void;
  onRegenerate: (message: Message) => void;
  onStopGenerating: () => void;
  onActionClick: ChatActionClickHandler;
}

export function ChatTimeline({
  messages,
  knowledgeBase,
  chatService,
  hasConnector,
  currentUser,
  startedFrom,
  onEdit,
  onFeedback,
  onRegenerate,
  onStopGenerating,
  onActionClick,
  chatState,
}: ChatTimelineProps) {
  const items = useMemo(() => {
    const timelineItems = getTimelineItemsfromConversation({
      chatService,
      hasConnector,
      messages,
      currentUser,
      startedFrom,
      chatState,
    });

    const consolidatedChatItems: Array<ChatTimelineItem | ChatTimelineItem[]> = [];
    let currentGroup: ChatTimelineItem[] | null = null;

    for (const item of timelineItems) {
      if (item.display.hide || !item) continue;

      if (item.display.collapsed) {
        if (currentGroup) {
          currentGroup.push(item);
        } else {
          currentGroup = [item];
          consolidatedChatItems.push(currentGroup);
        }
      } else {
        consolidatedChatItems.push(item);
        currentGroup = null;
      }
    }

    return consolidatedChatItems;
  }, [chatService, hasConnector, messages, currentUser, startedFrom, chatState]);

  return (
    <EuiCommentList
      css={css`
        padding-bottom: 32px;
      `}
    >
      {items.length <= 1 ? (
        <ChatWelcomePanel knowledgeBase={knowledgeBase} />
      ) : (
        items.map((item, index) => {
          return Array.isArray(item) ? (
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
                onFeedback(item.message, feedback);
              }}
              onRegenerateClick={() => {
                onRegenerate(item.message);
              }}
              onEditSubmit={(message) => {
                onEdit(item.message, message);
              }}
              onStopGeneratingClick={onStopGenerating}
              onActionClick={onActionClick}
            />
          );
        })
      )}
    </EuiCommentList>
  );
}
