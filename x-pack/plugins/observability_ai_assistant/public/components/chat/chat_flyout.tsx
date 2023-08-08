/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiFlyout } from '@elastic/eui';
import React, { useState } from 'react';
import type { Message } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { ChatBody } from './chat_body';

export function ChatFlyout({
  title,
  messages,
  isOpen,
  onClose,
}: {
  title: string;
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  const {
    services: { http },
  } = useKibana();

  const [isConversationListExpanded, setIsConversationListExpanded] = useState(false);

  const service = useObservabilityAIAssistant();

  return isOpen ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlexGroup responsive={false} gutterSize="none">
        <EuiFlexItem>
          <ChatBody
            service={service}
            connectors={connectors}
            title={title}
            messages={messages}
            currentUser={currentUser}
            connectorsManagementHref={getConnectorsManagementHref(http)}
            isConversationListExpanded={isConversationListExpanded}
            onToggleExpandConversationList={() =>
              setIsConversationListExpanded(!isConversationListExpanded)
            }
            onChatComplete={() => {}}
            onChatUpdate={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  ) : null;
}
