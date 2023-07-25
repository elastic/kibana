/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useChatConversation } from '../../hooks/use_chat_conversation';
import { ChatTimeline } from './chat_timeline';
import { ChatPromptEditor } from './chat_prompt_editor';
import { AssistantAvatar } from '../assistant_avatar';

export interface ChatFlyoutProps {
  conversationId?: string;
}

export function ChatFlyout({ conversationId }: ChatFlyoutProps) {
  const { title, messages } = useChatConversation({ conversationId });

  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = (prompt: string) => {};

  return isOpen ? (
    <EuiFlyout onClose={() => setIsOpen(false)} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AssistantAvatar size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
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
