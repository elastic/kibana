/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { Subscription } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { MessageRole, type ConversationCreateRequest, type Message } from '../../common/types';
import type { ChatPromptEditorProps } from '../components/chat/chat_prompt_editor';
import type { ChatTimelineProps } from '../components/chat/chat_timeline';
import type { ObservabilityAIAssistantService, PendingMessage } from '../types';
import { getTimelineItemsfromConversation } from '../utils/get_timeline_items_from_conversation';
import type { UseGenAIConnectorsResult } from './use_genai_connectors';

export function createNewConversation(): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title: '',
    },
    labels: {},
    numeric_labels: {},
  };
}

export type UseTimelineResult = Pick<
  ChatTimelineProps,
  'onEdit' | 'onFeedback' | 'onRegenerate' | 'onStopGenerating' | 'items'
> &
  Pick<ChatPromptEditorProps, 'onSubmit'>;

export function useTimeline({
  initialConversation,
  connectors,
  currentUser,
  service,
}: {
  initialConversation?: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  service: ObservabilityAIAssistantService;
}): UseTimelineResult {
  const connectorId = connectors.selectedConnector;

  const hasConnector = !!connectorId;

  const [conversation, setConversation] = useState(initialConversation || createNewConversation());

  const conversationItems = useMemo(() => {
    return getTimelineItemsfromConversation({
      conversation,
      currentUser,
      hasConnector,
    });
  }, [conversation, currentUser, hasConnector]);

  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const [pendingMessage, setPendingMessage] = useState<PendingMessage | undefined>();

  const controllerRef = useRef(new AbortController());

  function chat(messages: Message[]): Promise<void> {
    const controller = new AbortController();
    return new Promise<PendingMessage>((resolve, reject) => {
      if (!connectorId) {
        reject(new Error('Can not add a message without a connector'));
        return;
      }

      setConversation((conv) => ({
        ...conv,
        messages,
      }));

      const response$ = service.chat({ messages, connectorId });

      let pendingMessageLocal = pendingMessage;

      const nextSubscription = response$.subscribe({
        next: (nextPendingMessage) => {
          pendingMessageLocal = nextPendingMessage;
          setPendingMessage(() => nextPendingMessage);
        },
        error: reject,
        complete: () => {
          resolve(pendingMessageLocal!);
        },
      });

      setSubscription(() => {
        controllerRef.current = controller;
        return nextSubscription;
      });
    })
      .then(async (nextMessage) => {
        if (nextMessage.error) {
          return;
        }
        if (nextMessage.aborted) {
          return;
        }

        setPendingMessage(undefined);

        const nextMessages = messages.concat({
          '@timestamp': new Date().toISOString(),
          message: {
            ...nextMessage.message,
          },
        });

        setConversation((conv) => ({ ...conv, messages: nextMessages }));

        if (nextMessage?.message.function_call?.name) {
          const name = nextMessage.message.function_call.name;

          const message = await service.executeFunction(
            name,
            nextMessage.message.function_call.arguments,
            controller.signal
          );

          await chat(
            nextMessages.concat({
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.System,
                name,
                content: `The following data was returned by the function: 
\`\`\`
${JSON.stringify(message.content, null, 2).trim()}
\`\`\``,
                data: JSON.stringify(message.data),
              },
            })
          );
        }
      })
      .catch((err) => {});
  }

  const items = useMemo(() => {
    if (pendingMessage) {
      return conversationItems.concat({
        id: '',
        canCopy: true,
        canEdit: false,
        canExpand: pendingMessage.message.role === MessageRole.System,
        canRegenerate: pendingMessage.aborted || !!pendingMessage.error,
        canGiveFeedback: false,
        title: '',
        role: pendingMessage.message.role,
        content: pendingMessage.message.content,
        loading: !pendingMessage.aborted && !pendingMessage.error,
        function_call: pendingMessage.message.function_call,
        currentUser,
        error: pendingMessage.error,
      });
    }

    return conversationItems;
  }, [conversationItems, pendingMessage, currentUser]);

  useEffect(() => {
    return () => {
      // controllerRef.current.abort();
      subscription?.unsubscribe();
    };
  }, [subscription]);

  return {
    items,
    onEdit: (item, content) => {},
    onFeedback: (item, feedback) => {},
    onRegenerate: (item) => {
      const indexOf = items.indexOf(item);

      const messages = conversation.messages.slice(0, indexOf - 1);
      chat(messages);
    },
    onStopGenerating: () => {
      subscription?.unsubscribe();
      setPendingMessage((prevPendingMessage) => ({
        message: {
          role: MessageRole.Assistant,
          ...prevPendingMessage?.message,
        },
        aborted: true,
        error: new AbortError(),
      }));
      setSubscription(undefined);
    },
    onSubmit: async (message) => {
      await chat(conversation.messages.concat(message));
    },
  };
}
