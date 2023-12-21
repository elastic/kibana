/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { Message } from '../../../common/types';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatBody } from './chat_body';
import { ConversationList } from './conversation_list';
import { MultiPaneFlyout } from './multipane_flyout';

const containerClassName = css`
  max-height: 100%;
  height: 100%;
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
  const {
    services: { http },
  } = useKibana();

  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const service = useObservabilityAIAssistant();

  const router = useObservabilityAIAssistantRouter();

  const knowledgeBase = useKnowledgeBase();

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const conversationsHeaderClassName = css`
    padding-top: 12px;
    padding-bottom: 12px;
    border-bottom: solid 1px ${euiTheme.border.color};
  `;

  const [showConversationList, setShowConversationList] = useState(false);

  const conversations = useAbortableAsync(
    ({ signal }) => {
      return service.callApi('POST /internal/observability_ai_assistant/conversations', {
        signal,
      });
    },
    [service]
  );

  const displayedConversations = useMemo(() => {
    return [
      ...(!conversationId ? [{ id: '', label: EMPTY_CONVERSATION_TITLE }] : []),
      ...(conversations.value?.conversations ?? []).map((conv) => ({
        id: conv.conversation.id,
        label: conv.conversation.title,
        href: router.link('/conversations/{conversationId}', {
          path: {
            conversationId: conv.conversation.id,
          },
        }),
      })),
    ];
  }, [conversationId, conversations.value?.conversations, router]);

  const handleLoadConversations = () => {
    setShowConversationList(true);
  };

  return isOpen ? (
    <MultiPaneFlyout
      flexDirection="row"
      onClose={onClose}
      size={showConversationList ? 'l' : 'm'}
      isSwitchable
      slotOne={{
        content: (
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
                className={conversationsHeaderClassName}
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
                    onClick={handleLoadConversations}
                  >
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.conversationListDeepLinkLabel',
                      {
                        defaultMessage: 'Go to conversations',
                      }
                    )}
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
                knowledgeBase={knowledgeBase}
                startedFrom={startedFrom}
                onConversationUpdate={(conversation) => {
                  setConversationId(conversation.conversation.id);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
      slotTwo={
        showConversationList
          ? {
              content: (
                <ConversationList
                  selected={conversationId ?? ''}
                  loading={conversations.loading}
                  error={conversations.error}
                  conversations={displayedConversations}
                  onClickNewChat={() => {}}
                  onClickDeleteConversation={() => {}}
                />
              ),
              initialWidth: 30,
            }
          : undefined
      }
    />
  ) : null;
}
