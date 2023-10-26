/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { first } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { isObservable, Subscription } from 'rxjs';
import { MessageRole, type Message } from '../../../common/types';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useKibana } from '../../hooks/use_kibana';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useConversation } from '../../hooks/use_conversation';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import type { PendingMessage } from '../../types';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StartChatButton } from '../buttons/start_chat_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { ChatFlyout } from '../chat/chat_flyout';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { InsightBase } from './insight_base';

function ChatContent({
  title: defaultTitle,
  initialMessages,
  connectorId,
}: {
  title: string;
  initialMessages: Message[];
  connectorId: string;
}) {
  const chatService = useObservabilityAIAssistantChatService();

  const [pendingMessage, setPendingMessage] = useState<PendingMessage | undefined>();

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const [conversationId, setConversationId] = useState<string>();

  const {
    conversation,
    displayedMessages,
    setDisplayedMessages,
    getSystemMessage,
    save,
    saveTitle,
  } = useConversation({
    conversationId,
    connectorId,
    chatService,
    initialMessages,
  });

  const conversationTitle = conversationId
    ? conversation.value?.conversation.title || ''
    : defaultTitle;

  const controllerRef = useRef(new AbortController());

  const reloadRecalledMessages = useCallback(
    async (messages: Message[]) => {
      controllerRef.current.abort();

      const controller = (controllerRef.current = new AbortController());

      const isStartOfConversation =
        messages.some((message) => message.message.role === MessageRole.Assistant) === false;

      if (isStartOfConversation && chatService.hasFunction('recall')) {
        // manually execute recall function and append to list of
        // messages
        const functionCall = {
          name: 'recall',
          args: JSON.stringify({ queries: [], contexts: [] }),
        };

        const response = await chatService.executeFunction({
          ...functionCall,
          messages,
          signal: controller.signal,
          connectorId,
        });

        if (isObservable(response)) {
          throw new Error('Recall function unexpectedly returned an Observable');
        }

        return [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: functionCall.name,
                arguments: functionCall.args,
                trigger: MessageRole.User as const,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: functionCall.name,
              content: JSON.stringify(response.content),
            },
          },
        ];
      }

      return [];
    },
    [chatService, connectorId]
  );

  const reloadConversation = useCallback(async () => {
    setLoading(true);

    setDisplayedMessages(initialMessages);
    setPendingMessage(undefined);

    const messages = [getSystemMessage(), ...initialMessages];

    const recalledMessages = await reloadRecalledMessages(messages);
    const next = messages.concat(recalledMessages);

    setDisplayedMessages(next);

    let lastPendingMessage: PendingMessage | undefined;

    const nextSubscription = chatService
      .chat({ messages: next, connectorId, function: 'none' })
      .subscribe({
        next: (msg) => {
          lastPendingMessage = msg;
          setPendingMessage(() => msg);
        },
        complete: () => {
          setDisplayedMessages((prev) =>
            prev.concat({
              '@timestamp': new Date().toISOString(),
              ...lastPendingMessage!,
            })
          );
          setPendingMessage(lastPendingMessage);
          setLoading(false);
        },
      });

    setSubscription(nextSubscription);
  }, [
    reloadRecalledMessages,
    chatService,
    connectorId,
    initialMessages,
    getSystemMessage,
    setDisplayedMessages,
  ]);

  useEffect(() => {
    reloadConversation();
  }, [reloadConversation]);

  useEffect(() => {
    setDisplayedMessages(initialMessages);
  }, [initialMessages, setDisplayedMessages]);

  const [isOpen, setIsOpen] = useState(false);

  const messagesWithPending = useMemo(() => {
    return pendingMessage
      ? displayedMessages.concat({
          '@timestamp': new Date().toISOString(),
          message: {
            ...pendingMessage.message,
          },
        })
      : displayedMessages;
  }, [pendingMessage, displayedMessages]);

  const firstAssistantMessage = first(
    messagesWithPending.filter(
      (message) =>
        message.message.role === MessageRole.Assistant &&
        (!message.message.function_call?.trigger ||
          message.message.function_call.trigger === MessageRole.Assistant)
    )
  );

  return (
    <>
      <MessagePanel
        body={
          <MessageText
            content={firstAssistantMessage?.message.content ?? ''}
            loading={loading}
            onActionClick={async () => {}}
          />
        }
        error={pendingMessage?.error}
        controls={
          loading ? (
            <StopGeneratingButton
              onClick={() => {
                subscription?.unsubscribe();
                setLoading(false);
                setDisplayedMessages((prevMessages) =>
                  prevMessages.concat({
                    '@timestamp': new Date().toISOString(),
                    message: {
                      ...pendingMessage!.message,
                    },
                  })
                );
                setPendingMessage((prev) => ({
                  message: {
                    role: MessageRole.Assistant,
                    ...prev?.message,
                  },
                  aborted: true,
                  error: new AbortError(),
                }));
              }}
            />
          ) : (
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow={false}>
                <RegenerateResponseButton
                  onClick={() => {
                    reloadConversation();
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StartChatButton
                  onClick={() => {
                    setIsOpen(() => true);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
      />
      <ChatFlyout
        title={conversationTitle}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(() => false);
        }}
        messages={displayedMessages}
        conversationId={conversationId}
        startedFrom="contextualInsight"
        onChatComplete={(nextMessages) => {
          save(nextMessages)
            .then((nextConversation) => {
              setConversationId(nextConversation.conversation.id);
            })
            .catch(() => {});
        }}
        onChatUpdate={(nextMessages) => {
          setDisplayedMessages(nextMessages);
        }}
        onChatTitleSave={(newTitle) => {
          saveTitle(newTitle);
        }}
      />
    </>
  );
}

export function Insight({ messages, title }: { messages: Message[]; title: string }) {
  const [hasOpened, setHasOpened] = useState(false);

  const connectors = useGenAIConnectors();

  const service = useObservabilityAIAssistant();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return service.start({ signal });
    },
    [service]
  );

  const {
    services: { http },
  } = useKibana();

  let children: React.ReactNode = null;

  if (hasOpened && connectors.selectedConnector) {
    children = (
      <ChatContent
        title={title}
        initialMessages={messages}
        connectorId={connectors.selectedConnector}
      />
    );
  } else if (!connectors.loading && !connectors.connectors?.length) {
    children = (
      <MissingCredentialsCallout connectorsManagementHref={getConnectorsManagementHref(http!)} />
    );
  }

  return (
    <InsightBase
      title={title}
      onToggle={(isOpen) => {
        setHasOpened((prevHasOpened) => prevHasOpened || isOpen);
      }}
      controls={<ConnectorSelectorBase {...connectors} />}
      loading={connectors.loading || chatService.loading}
    >
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
          {children}
        </ObservabilityAIAssistantChatServiceProvider>
      ) : null}
    </InsightBase>
  );
}
