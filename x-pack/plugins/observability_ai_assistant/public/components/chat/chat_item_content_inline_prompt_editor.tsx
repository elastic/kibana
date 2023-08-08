/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MessageText } from '../message_panel/message_text';
import { ChatPromptEditor } from './chat_prompt_editor';
import { MessageRole } from '../../../common';

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
  onSubmit: (newPrompt: string) => void;
}
export function ChatItemContentInlinePromptEditor({
  content,
  functionCall,
  editing,
  loading,
  onSubmit,
}: Props) {
  return !editing ? (
    <MessageText content={content || ''} loading={loading} />
  ) : (
    <ChatPromptEditor
      initialPrompt={content}
      initialFunctionPayload={functionCall?.arguments}
      initialSelectedFunctionName={functionCall?.name}
      onSubmit={onSubmit}
    />
  );
}
