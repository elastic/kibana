/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MessageText } from '../message_panel/message_text';
import { ChatPromptEditor } from './chat_prompt_editor';
import { type Message, MessageRole } from '../../../common';
import type { ChatActionClickHandler } from './types';
import type { ObservabilityAIAssistantChatService } from '../../types';

interface Props {
  chatService: ObservabilityAIAssistantChatService;
  content: string | undefined;
  functionCall:
    | {
        name: string;
        arguments?: string | undefined;
        trigger: MessageRole;
      }
    | undefined;
  loading: boolean;
  editing: boolean;
  onSubmit: (message: Message) => void;
  onActionClick: ChatActionClickHandler;
}
export function ChatItemContentInlinePromptEditor({
  chatService,
  content,
  functionCall,
  editing,
  loading,
  onSubmit,
  onActionClick,
}: Props) {
  return !editing ? (
    <MessageText content={content || ''} loading={loading} onActionClick={onActionClick} />
  ) : (
    <ChatPromptEditor
      chatService={chatService}
      disabled={false}
      loading={false}
      initialPrompt={content}
      initialFunctionPayload={functionCall?.arguments}
      initialSelectedFunctionName={functionCall?.name}
      trigger={functionCall?.trigger}
      onSubmit={onSubmit}
    />
  );
}
