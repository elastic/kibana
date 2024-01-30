/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiResizableContainer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { v4 } from 'uuid';
import type { Message } from '../../../common/types';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useForceUpdate } from '../../hooks/use_force_update';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatBody } from './chat_body';
import { ConversationList } from './conversation_list';

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
  const {
    services: { notifications },
  } = useKibana();

  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const service = useObservabilityAIAssistant();

  const chatBodyKeyRef = useRef(v4());
  const forceUpdate = useForceUpdate();
  const reloadConversation = useCallback(() => {
    chatBodyKeyRef.current = v4();
    forceUpdate();
  }, [forceUpdate]);

  const [isUpdatingList, setIsUpdatingList] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
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
      ...(conversations.value?.conversations ?? []).map(({ conversation }) => ({
        id: conversation.id,
        label: conversation.title,
        onClick: () => {
          setConversationId(conversation.id);
          reloadConversation();
        },
      })),
    ];
  }, [conversationId, conversations.value?.conversations, reloadConversation]);

  const { element: confirmDeleteElement, confirm: confirmDeleteFunction } = useConfirmModal({
    title: i18n.translate('xpack.observabilityAiAssistant.flyout.confirmDeleteConversationTitle', {
      defaultMessage: 'Delete this conversation?',
    }),
    children: i18n.translate(
      'xpack.observabilityAiAssistant.flyout.confirmDeleteConversationContent',
      {
        defaultMessage: 'This action cannot be undone.',
      }
    ),
    confirmButtonText: i18n.translate(
      'xpack.observabilityAiAssistant.flyout.confirmDeleteButtonText',
      {
        defaultMessage: 'Delete conversation',
      }
    ),
  });

  return isOpen ? (
    <EuiFlyout
      onClose={onClose}
      closeButtonProps={{ css: { marginRight: '8px', marginTop: '8px' } }}
    >
      {confirmDeleteElement}
      <EuiResizableContainer css={{ height: '100%' }}>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              mode="collapsible"
              initialSize={30}
              minSize="30"
              paddingSize="none"
              css={{
                borderRight: `1px solid ${euiTheme.border.color}`,
              }}
            >
              <ConversationList
                selected={conversationId ?? ''}
                conversations={displayedConversations}
                loading={conversations.loading || isUpdatingList}
                error={conversations.error}
                onClickNewChat={() => {
                  if (conversationId) {
                    setConversationId(undefined);
                  }
                  reloadConversation();
                }}
                onClickDeleteConversation={(id) => {
                  confirmDeleteFunction()
                    .then(async (confirmed) => {
                      if (!confirmed) {
                        return;
                      }

                      setIsUpdatingList(true);

                      await service.callApi(
                        'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
                        {
                          params: {
                            path: {
                              conversationId: id,
                            },
                          },
                          signal: null,
                        }
                      );

                      const isCurrentConversation = id === conversationId;
                      const hasOtherConversations = conversations.value?.conversations.find(
                        (conversation) =>
                          'id' in conversation.conversation && conversation.conversation.id !== id
                      );

                      if (isCurrentConversation) {
                        setConversationId(
                          hasOtherConversations ? hasOtherConversations.conversation.id : undefined
                        );
                        reloadConversation();
                      }

                      conversations.refresh();
                    })
                    .catch((error) => {
                      notifications.toasts.addError(error, {
                        title: i18n.translate(
                          'xpack.observabilityAiAssistant.flyout.failedToDeleteConversation',
                          {
                            defaultMessage: 'Could not delete conversation',
                          }
                        ),
                      });
                    })
                    .finally(() => {
                      setIsUpdatingList(false);
                    });
                }}
              />
            </EuiResizablePanel>

            <EuiResizableButton alignIndicator="center" />

            <EuiResizablePanel mode="main" initialSize={70} minSize="10" paddingSize="none">
              <EuiFlexGroup
                css={{ height: '100%' }}
                responsive={false}
                gutterSize="none"
                direction="column"
                className={containerClassName}
              >
                <EuiFlexItem grow className={bodyClassName}>
                  <ChatBody
                    key={chatBodyKeyRef.current}
                    connectors={connectors}
                    initialTitle={initialTitle}
                    initialMessages={initialMessages}
                    initialConversationId={conversationId}
                    currentUser={currentUser}
                    knowledgeBase={knowledgeBase}
                    startedFrom={startedFrom}
                    onConversationUpdate={(conversation) => {
                      conversations.refresh();
                      setConversationId(conversation.conversation.id);
                    }}
                    showLinkToConversationsApp={true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    </EuiFlyout>
  ) : null;
}
