/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useState } from 'react';
import { ConversationCreateRequest } from '../../../common/types';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';

export interface ChatFlyoutProps {
  conversation: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
}

export function ChatFlyout({ conversation, connectors }: ChatFlyoutProps) {
  const {
    conversation: { title },
    messages,
  } = conversation;

  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = (prompt: string) => {};

  return isOpen ? (
    <EuiFlyout onClose={() => setIsOpen(false)} size="m">
      <EuiFlyoutHeader hasBorder>
        <ChatHeader title={title} connectors={connectors} />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <ChatTimeline messages={messages} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter
        css={{ borderTop: `solid 1px ${euiThemeVars.euiBorderColor}`, background: '#fff' }}
      >
        <ChatPromptEditor onSubmitPrompt={handleSubmit} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : null;
}
