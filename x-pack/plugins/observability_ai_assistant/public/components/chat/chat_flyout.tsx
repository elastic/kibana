/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { Message } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { getModelsManagementHref } from '../../utils/get_models_management_href';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatBody } from './chat_body';

const containerClassName = css`
  max-height: 100%;
`;

const bodyClassName = css`
  overflow-y: auto;
`;

export function ChatFlyout({
  initialTitle,
  initialMessages,
  onClose,
  isOpen,
  startedFrom,
}: {
  initialTitle: string;
  initialMessages: Message[];
  isOpen: boolean;
  startedFrom: StartedFrom;
  onClose: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { http },
  } = useKibana();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const router = useObservabilityAIAssistantRouter();

  const knowledgeBase = useKnowledgeBase();

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  return isOpen ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlexGroup
        responsive={false}
        gutterSize="none"
        direction="column"
        className={containerClassName}
      >
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            css={{ borderBottom: `solid 1px ${euiTheme.border.color}` }}
          >
            {conversationId ? (
              <EuiLink
                data-test-subj="observabilityAiAssistantChatFlyoutOpenConversationLink"
                href={router.link('/conversations/{conversationId}', {
                  path: { conversationId },
                })}
              >
                {i18n.translate('xpack.observabilityAiAssistant.conversationDeepLinkLabel', {
                  defaultMessage: 'Open conversation',
                })}
              </EuiLink>
            ) : (
              <EuiLink
                data-test-subj="observabilityAiAssistantChatFlyoutGoToConversationsLink"
                href={router.link('/conversations/new')}
              >
                {i18n.translate('xpack.observabilityAiAssistant.conversationListDeepLinkLabel', {
                  defaultMessage: 'Go to conversations',
                })}
              </EuiLink>
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow className={bodyClassName}>
          <ChatBody
            connectors={connectors}
            initialTitle={initialTitle}
            initialMessages={initialMessages}
            currentUser={currentUser}
            connectorsManagementHref={getConnectorsManagementHref(http)}
            modelsManagementHref={getModelsManagementHref(http)}
            knowledgeBase={knowledgeBase}
            startedFrom={startedFrom}
            onConversationUpdate={(conversation) => {
              setConversationId(conversation.conversation.id);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  ) : null;
}
