/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { ChatBody } from '../../components/chat/chat_body';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';

const containerClassName = css`
  max-width: 100%;
`;

const chatBodyContainerClassName = css`
  max-width: 100%;
`;

export function ConversationView() {
  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistant();
  return (
    <EuiFlexGroup direction="row" className={containerClassName}>
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow className={chatBodyContainerClassName}>
        <ChatBody
          currentUser={currentUser}
          connectors={connectors}
          initialConversation={undefined}
          service={service}
        />
        <EuiSpacer size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
