/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { MessageRole } from '../../../common/types';
import type { Feedback } from '../feedback_buttons';
import { ChatItem } from './chat_item';

export interface ChatTimelineItem {
  id: string;
  title: string;
  role: MessageRole;
  content?: string;
  function_call?: {
    name: string;
    args?: string;
    trigger?: MessageRole;
  };
  loading: boolean;
  error?: any;
  canEdit: boolean;
  canRegenerate: boolean;
  canGiveFeedback: boolean;
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
}

export interface ChatTimelineProps {
  items: ChatTimelineItem[];
  onEdit: (item: ChatTimelineItem, content: string) => void;
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
  return (
    <EuiCommentList>
      {items.map((item) => (
        <ChatItem
          key={item.id}
          {...item}
          onFeedbackClick={(feedback) => {
            onFeedback(item, feedback);
          }}
          onRegenerateClick={() => {
            onRegenerate(item);
          }}
          onEditSubmit={(content) => {
            onEdit(item, content);
          }}
          onStopGeneratingClick={onStopGenerating}
        />
      ))}
    </EuiCommentList>
  );
}
