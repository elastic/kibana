/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { MessageRole } from '../../common';
import type { ConversationCreateRequest } from '../../common/types';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';

export function getTimelineItemsfromConversation({
  currentUser,
  conversation,
  hasConnector,
}: {
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  conversation: ConversationCreateRequest;
  hasConnector: boolean;
}): ChatTimelineItem[] {
  return [
    {
      id: v4(),
      role: MessageRole.User,
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
      canEdit: false,
      canGiveFeedback: false,
      canRegenerate: false,
      loading: false,
      currentUser,
    },
    ...conversation.messages.map((message) => {
      const hasFunction = !!message.message.function_call?.name;
      const isSystemPrompt = message.message.role === MessageRole.System;

      let title: string;
      if (hasFunction) {
        title = i18n.translate('xpkac.observabilityAiAssistant.suggestedFunctionEvent', {
          defaultMessage: 'suggested a function',
        });
      } else if (isSystemPrompt) {
        title = i18n.translate('xpack.observabilityAiAssistant.addedSystemPromptEvent', {
          defaultMessage: 'added a prompt',
        });
      } else {
        title = '';
      }

      const props = {
        id: v4(),
        role: message.message.role,
        canEdit: hasConnector && (message.message.role === MessageRole.User || hasFunction),
        canRegenerate: hasConnector && message.message.role === MessageRole.Assistant,
        canGiveFeedback: message.message.role === MessageRole.Assistant,
        loading: false,
        title,
        content: message.message.content,
        currentUser,
      };

      return props;
    }),
  ];
}
