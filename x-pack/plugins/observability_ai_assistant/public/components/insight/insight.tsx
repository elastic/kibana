/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Message } from '../../../common/types';
import { useChat } from '../../hooks/use_chat';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { InsightBase } from './insight_base';
import { InsightMissingCredentials } from './insight_missing_credentials';
import { StopGeneratingButton } from '../stop_generating_button';
import { RegenerateResponseButton } from '../regenerate_response_button';

function ChatContent({ messages, connectorId }: { messages: Message[]; connectorId: string }) {
  const chat = useChat({ messages, connectorId });

  return (
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
          <RegenerateResponseButton
            onClick={() => {
              chat.regenerate();
            }}
          />
        )
      }
    />
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
