/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useCurrentUser } from '../../hooks/use_current_user';
import { Message } from '../../../common/types';
import { ChatItem } from './chat_item';

export interface ChatTimelineProps {
  messages: Message[];
  onEditMessage?: (id: string) => void;
}

export function ChatTimeline({ messages = [], onEditMessage }: ChatTimelineProps) {
  const { uiSettings } = useKibana().services;
  const currentUser = useCurrentUser();

  const dateFormat = uiSettings?.get('dateFormat');

  const handleFeedback = () => {};

  return (
    <EuiCommentList>
      {messages.map((message, index) => (
        <ChatItem
          currentUser={currentUser}
          dateFormat={dateFormat}
          index={index}
          isLoading={false}
          message={message}
          onFeedbackClick={handleFeedback}
          onEditMessage={onEditMessage}
        />
      ))}
    </EuiCommentList>
  );
}
