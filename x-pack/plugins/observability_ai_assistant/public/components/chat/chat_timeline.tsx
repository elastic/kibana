/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { css } from '@emotion/react';
import { compact } from 'lodash';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { ChatItem } from './chat_item';
import { ChatWelcomePanel } from './chat_welcome_panel';
import type { Feedback } from '../feedback_buttons';
import type { Message } from '../../../common';

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
  items: ChatTimelineItem[];
  onEdit: (item: ChatTimelineItem, message: Message) => Promise<void>;
  onFeedback: (item: ChatTimelineItem, feedback: Feedback) => void;
  onRegenerate: (item: ChatTimelineItem) => void;
  onStopGenerating: () => void;
}

export function ChatTimeline({
  items = [],
  onEdit,
  onFeedback,
  onRegenerate,
  onStopGenerating,
}: ChatTimelineProps) {
  const filteredItems = items.filter((item) => !item.display.hide);

  return (
    <EuiCommentList
      css={css`
        padding-bottom: 32px;
      `}
    >
      {compact(
        filteredItems.map((item, index) => (
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
            onEditSubmit={(message) => {
              return onEdit(item, message);
            }}
            onStopGeneratingClick={onStopGenerating}
          />
        ))
      )}
      {filteredItems.length === 1 ? <ChatWelcomePanel /> : null}
    </EuiCommentList>
  );
}
