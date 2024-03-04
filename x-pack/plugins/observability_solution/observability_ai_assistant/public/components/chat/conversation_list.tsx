/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  euiScrollBarStyles,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { useKibana } from '../../hooks/use_kibana';
import { NewChatButton } from '../buttons/new_chat_button';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';

const titleClassName = css`
  text-transform: uppercase;
`;

const panelClassName = css`
  max-height: 100%;
  padding-top: 56px;
`;

const overflowScrollClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const newChatButtonWrapperClassName = css`
  padding-bottom: 5px;
`;

export function ConversationList({
  selected,
  onClickChat,
  onClickNewChat,
  onClickDeleteConversation,
}: {
  selected: string;
  onClickChat?: (id: string) => void;
  onClickNewChat: () => void;
  onClickDeleteConversation: (id: string) => void;
}) {
  const {
    services: { notifications },
  } = useKibana();

  const euiTheme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(euiTheme);

  const service = useObservabilityAIAssistant();

  const containerClassName = css`
    height: 100%;
    border-top: solid 1px ${euiTheme.euiTheme.border.color};
    padding: ${euiTheme.euiTheme.size.s};
  `;

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

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [isUpdatingList, setIsUpdatingList] = useState(false);

  const conversations = useAbortableAsync(
    ({ signal }) => {
      setIsUpdatingList(true);
      return service.callApi('POST /internal/observability_ai_assistant/conversations', {
        signal,
      });
    },
    [service]
  );

  useEffect(() => {
    setIsUpdatingList(conversations.loading);
  }, [conversations.loading]);

  const displayedConversations = useMemo(() => {
    return [
      ...(!conversationId
        ? [{ id: '', label: EMPTY_CONVERSATION_TITLE, lastUpdated: '', href: '' }]
        : []),
      ...(conversations.value?.conversations ?? []).map(({ conversation }) => ({
        id: conversation.id,
        label: conversation.title,
        lastUpdated: conversation.last_updated,
        onClick: () => {
          onClickChat?.(conversation.id);
        },
      })),
    ];
  }, [conversationId, conversations.value?.conversations, onClickChat]);

  const handleDeleteConversation = (id: string) => {
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
          (conv) => 'id' in conv.conversation && conv.conversation.id !== id
        );

        if (isCurrentConversation) {
          setConversationId(
            hasOtherConversations ? hasOtherConversations.conversation.id : undefined
          );
        }

        conversations.refresh();
      })
      .catch((err) => {
        notifications.toasts.addError(err, {
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
        onClickDeleteConversation(id);
      });
  };

  const handleClickNewChat = () => {
    onClickNewChat();
  };

  return (
    <>
      <EuiPanel paddingSize="none" hasShadow={false} className={panelClassName}>
        <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
          <EuiFlexItem grow className={overflowScrollClassName(scrollBarStyles)}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                  <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="s" />
                      <EuiText className={titleClassName} size="s">
                        <strong>
                          {i18n.translate('xpack.observabilityAiAssistant.conversationList.title', {
                            defaultMessage: 'Previously',
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    {isUpdatingList ? (
                      <EuiFlexItem grow={false}>
                        <EuiLoadingSpinner size="s" />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>

              {conversations.error ? (
                <EuiFlexItem grow={false}>
                  <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="warning" color="danger" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s" color="danger">
                          {i18n.translate(
                            'xpack.observabilityAiAssistant.conversationList.errorMessage',
                            {
                              defaultMessage: 'Failed to load',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ) : null}

              {displayedConversations?.length ? (
                <EuiFlexItem grow>
                  <EuiListGroup flush={false} gutterSize="none">
                    {displayedConversations?.map((conversation) => (
                      <EuiListGroupItem
                        key={conversation.id}
                        label={conversation.label}
                        size="s"
                        isActive={conversation.id === selected}
                        isDisabled={isUpdatingList}
                        wrapText
                        showToolTip
                        onClick={
                          onClickChat
                            ? (e) => {
                                onClickChat(conversation.id);
                              }
                            : noop
                        }
                        extraAction={
                          conversation.id
                            ? {
                                iconType: 'trash',
                                'aria-label': i18n.translate(
                                  'xpack.observabilityAiAssistant.conversationList.deleteConversationIconLabel',
                                  {
                                    defaultMessage: 'Delete',
                                  }
                                ),
                                onClick: () => {
                                  handleDeleteConversation(conversation.id);
                                },
                              }
                            : undefined
                        }
                      />
                    ))}
                  </EuiListGroup>
                </EuiFlexItem>
              ) : null}

              {!isUpdatingList && !conversations.error && !displayedConversations?.length ? (
                <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.conversationList.noConversations',
                      {
                        defaultMessage: 'No conversations',
                      }
                    )}
                  </EuiText>
                </EuiPanel>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow className={newChatButtonWrapperClassName}>
                  <NewChatButton onClick={handleClickNewChat} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {confirmDeleteElement}
    </>
  );
}
