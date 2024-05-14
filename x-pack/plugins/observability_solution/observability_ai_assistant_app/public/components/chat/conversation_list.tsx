/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  euiScrollBarStyles,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import type { UseConversationListResult } from '../../hooks/use_conversation_list';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { NewChatButton } from '../buttons/new_chat_button';

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
  conversations,
  isLoading,
  selectedConversationId,
  onConversationSelect,
  onConversationDeleteClick,
}: {
  conversations: UseConversationListResult['conversations'];
  isLoading: boolean;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId?: string) => void;
  onConversationDeleteClick: (conversationId: string) => void;
}) {
  const router = useObservabilityAIAssistantRouter();

  const euiTheme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(euiTheme);

  const containerClassName = css`
    height: 100%;
    border-top: solid 1px ${euiTheme.euiTheme.border.color};
    padding: ${euiTheme.euiTheme.size.s};
  `;

  const { element: confirmDeleteElement, confirm: confirmDeleteCallback } = useConfirmModal({
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

  const displayedConversations = [
    ...(!selectedConversationId
      ? [
          {
            id: '',
            label: EMPTY_CONVERSATION_TITLE,
            lastUpdated: '',
            href: router.link('/conversations/new'),
          },
        ]
      : []),
    ...(conversations.value?.conversations ?? []).map(({ conversation }) => ({
      id: conversation.id,
      label: conversation.title,
      lastUpdated: conversation.last_updated,
      href: router.link('/conversations/{conversationId}', {
        path: {
          conversationId: conversation.id,
        },
      }),
    })),
  ];

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
                    {isLoading ? (
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
                        data-test-subj="observabilityAiAssistantConversationsLink"
                        key={conversation.id}
                        label={conversation.label}
                        size="s"
                        isActive={conversation.id === selectedConversationId}
                        isDisabled={isLoading}
                        wrapText
                        showToolTip
                        href={conversation.href}
                        onClick={(event) => {
                          if (onConversationSelect) {
                            event.preventDefault();
                            onConversationSelect(conversation.id);
                          }
                        }}
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
                                  confirmDeleteCallback().then((confirmed) => {
                                    if (!confirmed) {
                                      return;
                                    }

                                    onConversationDeleteClick(conversation.id);
                                  });
                                },
                              }
                            : undefined
                        }
                      />
                    ))}
                  </EuiListGroup>
                </EuiFlexItem>
              ) : null}

              {!isLoading && !conversations.error && !displayedConversations?.length ? (
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
                  <NewChatButton
                    href={router.link('/conversations/new')}
                    onClick={(
                      event: MouseEvent<HTMLButtonElement> | MouseEvent<HTMLAnchorElement>
                    ) => {
                      if (onConversationSelect) {
                        event.preventDefault();
                        onConversationSelect(undefined);
                      }
                    }}
                  />
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
