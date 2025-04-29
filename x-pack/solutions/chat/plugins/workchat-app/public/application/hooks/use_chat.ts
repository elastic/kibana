/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationCreatedEvent, ProgressionEvent } from '../../../common/chat_events';
import type { ChatError } from '../../../common/errors';
import {
  type ConversationEvent,
  createUserMessage,
  createAssistantMessage,
  createToolResult,
} from '../../../common/conversation_events';
import { useWorkChatServices } from './use_workchat_service';
import { useKibana } from './use_kibana';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  connectorId?: string;
  onConversationUpdate: (changes: ConversationCreatedEvent['conversation']) => void;
  onError?: (error: ChatError) => void;
}

export type ChatStatus = 'ready' | 'loading' | 'error';

export const useChat = ({
  conversationId,
  agentId,
  connectorId,
  onConversationUpdate,
  onError,
}: UseChatProps) => {
  const { chatService } = useWorkChatServices();
  const {
    services: { notifications },
  } = useKibana();
  const [conversationEvents, setConversationEvents] = useState<ConversationEvent[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ConversationEvent[]>([]);
  const [progressionEvents, setProgressionEvents] = useState<ProgressionEvent[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');

  const sendMessage = useCallback(
    (nextMessage: string) => {
      if (status === 'loading') {
        return;
      }

      setStatus('loading');
      setConversationEvents((prevEvents) => [
        ...prevEvents,
        createUserMessage({ content: nextMessage }),
      ]);

      const events$ = chatService.converse({
        nextMessage,
        conversationId,
        agentId,
        connectorId,
      });

      const streamMessages: ConversationEvent[] = [];

      let concatenatedChunks = '';

      const getAllStreamMessages = () => {
        return streamMessages.concat(
          concatenatedChunks.length ? [createAssistantMessage({ content: concatenatedChunks })] : []
        );
      };

      events$.subscribe({
        next: (event) => {
          // chunk received, we append it to the chunk buffer
          if (event.type === 'message_chunk') {
            concatenatedChunks += event.content_chunk;
            setPendingMessages(getAllStreamMessages());
            setProgressionEvents([]);
          }

          // full message received - we purge the chunk buffer
          // and insert the received message into the temporary list
          if (event.type === 'message') {
            concatenatedChunks = '';
            streamMessages.push(event.message);
            setPendingMessages(getAllStreamMessages());
          }

          if (event.type === 'tool_result') {
            concatenatedChunks = '';
            streamMessages.push(
              createToolResult({
                toolCallId: event.toolResult.callId,
                toolResult: event.toolResult.result,
              })
            );
            setPendingMessages(getAllStreamMessages());
          }

          if (event.type === 'conversation_created') {
            onConversationUpdate(event.conversation);
          }

          if (event.type === 'progression') {
            setProgressionEvents((previous) => [...previous, event]);
          }
        },
        complete: () => {
          setPendingMessages([]);
          setProgressionEvents([]);
          setConversationEvents((prevEvents) => [...prevEvents, ...streamMessages]);
          setStatus('ready');
        },
        error: (err) => {
          setPendingMessages([]);
          setProgressionEvents([]);
          setConversationEvents((prevEvents) => [...prevEvents, ...streamMessages]);
          setStatus('error');
          onError?.(err);

          notifications.toasts.addError(err, {
            title: i18n.translate('xpack.workchatApp.chat.chatError.title', {
              defaultMessage: 'Error loading chat response',
            }),
            toastMessage: `${err.code} - ${err.message}`,
          });
        },
      });
    },
    [
      chatService,
      notifications,
      status,
      agentId,
      conversationId,
      connectorId,
      onConversationUpdate,
      onError,
    ]
  );

  const setConversationEventsExternal = useCallback((newEvents: ConversationEvent[]) => {
    // TODO: unsub from observable + set status ready
    setConversationEvents(newEvents);
    setProgressionEvents([]);
    setPendingMessages([]);
  }, []);

  const allEvents = useMemo(() => {
    return [...conversationEvents, ...pendingMessages];
  }, [conversationEvents, pendingMessages]);

  return {
    status,
    sendMessage,
    conversationEvents: allEvents,
    progressionEvents,
    setConversationEvents: setConversationEventsExternal,
  };
};
