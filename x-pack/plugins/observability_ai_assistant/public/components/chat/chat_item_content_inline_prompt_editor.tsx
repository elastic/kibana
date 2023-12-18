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
import type { TelemetryEventTypeWithPayload } from '../../analytics';

interface Props {
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
  onActionClick: ChatActionClickHandler;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onSubmit: (message: Message) => void;
}
export function ChatItemContentInlinePromptEditor({
  content,
  functionCall,
  editing,
  loading,
  onActionClick,
  onSendTelemetry,
  onSubmit,
}: Props) {
  return !editing ? (
    <MessageText content={content || ''} loading={loading} onActionClick={onActionClick} />
  ) : (
    <ChatPromptEditor
      disabled={false}
      loading={false}
      initialPrompt={content}
      initialFunctionPayload={functionCall?.arguments}
      initialSelectedFunctionName={functionCall?.name}
      trigger={functionCall?.trigger}
      onSubmit={onSubmit}
      onSendTelemetry={onSendTelemetry}
    />
  );
}
