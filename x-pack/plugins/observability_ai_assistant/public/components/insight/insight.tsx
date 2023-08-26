/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { MessageRole, type Message } from '../../../common/types';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import type { PendingMessage } from '../../types';
import { ChatFlyout } from '../chat/chat_flyout';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StartChatButton } from '../buttons/start_chat_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { InsightBase } from './insight_base';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';

function ChatContent({
  title,
  messages,
  connectorId,
}: {
  title: string;
  messages: Message[];
  connectorId: string;
}) {
  const chatService = useObservabilityAIAssistantChatService();

  const [pendingMessage, setPendingMessage] = useState<PendingMessage | undefined>();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const reloadReply = useCallback(() => {
    setLoading(true);

    const nextSubscription = chatService.chat({ messages, connectorId }).subscribe({
      next: (msg) => {
        setPendingMessage(() => msg);
      },
      complete: () => {
        setLoading(false);
      },
    });

    setSubscription(nextSubscription);
  }, [messages, connectorId, chatService]);

  useEffect(() => {
    reloadReply();
  }, [reloadReply]);

  const [isOpen, setIsOpen] = useState(false);

  const displayedMessages = useMemo(() => {
    return pendingMessage
      ? messages.concat({
          '@timestamp': new Date().toISOString(),
          message: {
            ...pendingMessage.message,
          },
        })
      : messages;
  }, [pendingMessage, messages]);

  return (
    <>
      <MessagePanel
        body={<MessageText content={pendingMessage?.message.content ?? ''} loading={loading} />}
        error={pendingMessage?.error}
        controls={
          loading ? (
            <StopGeneratingButton
              onClick={() => {
                subscription?.unsubscribe();
                setLoading(false);
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
                    reloadReply();
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
        title={title}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(() => false);
        }}
        messages={displayedMessages}
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
      <ChatContent title={title} messages={messages} connectorId={connectors.selectedConnector} />
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
