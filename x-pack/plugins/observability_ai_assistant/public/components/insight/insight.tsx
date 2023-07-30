/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { type ConversationCreateRequest, type Message, MessageRole } from '../../../common/types';
import { useChat } from '../../hooks/use_chat';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { InsightBase } from './insight_base';
import { InsightMissingCredentials } from './insight_missing_credentials';
import { StopGeneratingButton } from '../stop_generating_button';
import { RegenerateResponseButton } from '../regenerate_response_button';
import { StartChatButton } from '../start_chat_button';
import { ChatFlyout } from '../chat/chat_flyout';

function ChatContent({ messages, connectorId }: { messages: Message[]; connectorId: string }) {
  const chat = useChat();

  const { generate } = chat;

  useEffect(() => {
    generate({ messages, connectorId }).catch(() => {
      // error is handled in chat, and we don't do anything with the full response for now.
    });
  }, [generate, messages, connectorId]);

  const initialConversation = useMemo<ConversationCreateRequest>(() => {
    const time = new Date().toISOString();
    return {
      '@timestamp': time,
      messages: chat.content
        ? messages.concat({
            '@timestamp': time,
            message: {
              role: MessageRole.Assistant,
              content: chat.content,
            },
          })
        : messages,
      conversation: {
        title: '',
      },
      labels: {},
      numeric_labels: {},
    };
  }, [messages, chat.content]);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <MessagePanel
        body={<MessageText content={chat.content ?? ''} loading={chat.loading} />}
        error={chat.error}
        controls={
          chat.loading ? (
            <StopGeneratingButton
              onClick={() => {
                chat.abort();
              }}
            />
          ) : (
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow={false}>
                <RegenerateResponseButton
                  onClick={() => {
                    generate({ messages, connectorId });
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
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(() => false);
        }}
        initialConversation={initialConversation}
      />
    </>
  );
}

export function Insight({ messages, title }: { messages: Message[]; title: string }) {
  const [hasOpened, setHasOpened] = useState(false);

  const connectors = useGenAIConnectors();

  const {
    services: { http },
  } = useKibana();

  let children: React.ReactNode = null;

  if (hasOpened && connectors.selectedConnector) {
    children = <ChatContent messages={messages} connectorId={connectors.selectedConnector} />;
  } else if (!connectors.loading && !connectors.connectors?.length) {
    children = (
      <InsightMissingCredentials
        connectorsManagementHref={http!.basePath.prepend(
          `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
        )}
      />
    );
  }

  return (
    <InsightBase
      title={title}
      onToggle={(isOpen) => {
        setHasOpened((prevHasOpened) => prevHasOpened || isOpen);
      }}
      controls={<ConnectorSelectorBase {...connectors} />}
      loading={connectors.loading}
    >
      {children}
    </InsightBase>
  );
}
