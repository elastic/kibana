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
    ...conversation.messages.map((message) => ({
      id: v4(),
      role: message.message.role,
      title: message.message.role === MessageRole.System ? 'added a system prompt' : '',
      content:
        message.message.role === MessageRole.System ? undefined : message.message.content || '',
      canEdit:
        hasConnector &&
        (message.message.role === MessageRole.User ||
          message.message.role === MessageRole.Function),
      canGiveFeedback: message.message.role === MessageRole.Assistant,
      canRegenerate: hasConnector && message.message.role === MessageRole.Assistant,
      loading: false,
      currentUser,
    })),
  ];
}
