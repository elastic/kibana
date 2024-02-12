/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantAvatar } from '../assistant_avatar';
import { ChatActionsMenu } from './chat_actions_menu';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { FlyoutWidthMode } from './chat_flyout';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';

// needed to prevent InlineTextEdit component from expanding container
const minWidthClassName = css`
  min-width: 0;
`;

const chatHeaderClassName = css`
  padding-top: 12px;
  padding-bottom: 12px;
`;

export function ChatHeader({
  connectors,
  conversationId,
  flyoutWidthMode,
  licenseInvalid,
  loading,
  showLinkToConversationsApp,
  title,
  onCopyConversation,
  onSaveTitle,
  onToggleFlyoutWidthMode,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  flyoutWidthMode?: FlyoutWidthMode;
  licenseInvalid: boolean;
  loading: boolean;
  showLinkToConversationsApp: boolean;
  title: string;
  onCopyConversation: () => void;
  onSaveTitle: (title: string) => void;
  onToggleFlyoutWidthMode?: (newFlyoutWidthMode: FlyoutWidthMode) => void;
}) {
  const theme = useEuiTheme();

  const router = useObservabilityAIAssistantRouter();

  const [newTitle, setNewTitle] = useState(title);

  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const handleToggleFlyoutWidthMode = () => {
    onToggleFlyoutWidthMode?.(flyoutWidthMode === 'side' ? 'full' : 'side');
  };

  const handleNavigateToConversations = () => {
    if (conversationId) {
      router.push('/conversations/{conversationId}', {
        path: {
          conversationId,
        },
        query: {},
      });
    } else {
      router.push('/conversations/new', { path: {}, query: {} });
    }
  };

  return (
    <EuiPanel
      borderRadius="none"
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      className={chatHeaderClassName}
    >
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          {loading ? <EuiLoadingSpinner size="l" /> : <AssistantAvatar size="s" />}
        </EuiFlexItem>

        <EuiFlexItem grow className={minWidthClassName}>
          <EuiInlineEditTitle
            heading="h2"
            size="s"
            value={newTitle}
            className={css`
              color: ${!!title ? theme.euiTheme.colors.text : theme.euiTheme.colors.subduedText};
            `}
            inputAriaLabel={i18n.translate(
              'xpack.observabilityAiAssistant.chatHeader.editConversationInput',
              { defaultMessage: 'Edit conversation' }
            )}
            isReadOnly={
              !conversationId ||
              !connectors.selectedConnector ||
              licenseInvalid ||
              !Boolean(onSaveTitle)
            }
            onChange={(e) => {
              setNewTitle(e.currentTarget.nodeValue || '');
            }}
            onSave={(e) => {
              if (onSaveTitle) {
                onSaveTitle(e);
              }
            }}
            onCancel={(previousTitle: string) => {
              setNewTitle(previousTitle);
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {flyoutWidthMode && onToggleFlyoutWidthMode ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    anchorPosition="downLeft"
                    button={
                      <EuiToolTip
                        content={i18n.translate(
                          'xpack.observabilityAiAssistant.chatHeader.euiToolTip.navigateToConversationsLabel',
                          { defaultMessage: 'Navigate to conversations' }
                        )}
                        display="block"
                      >
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.observabilityAiAssistant.chatHeader.euiButtonIcon.navigateToConversationsLabel',
                            { defaultMessage: 'Navigate to conversations' }
                          )}
                          data-test-subj="observabilityAiAssistantChatHeaderButton"
                          iconType="discuss"
                          onClick={handleNavigateToConversations}
                        />
                      </EuiToolTip>
                    }
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiPopover
                    anchorPosition="downLeft"
                    button={
                      <EuiToolTip
                        content={
                          flyoutWidthMode === 'side'
                            ? i18n.translate(
                                'xpack.observabilityAiAssistant.chatHeader.euiToolTip.expandFlyoutWidthModeLabel',
                                { defaultMessage: 'Expand flyout' }
                              )
                            : i18n.translate(
                                'xpack.observabilityAiAssistant.chatHeader.euiToolTip.collapseFlyoutWidthModeLabel',
                                { defaultMessage: 'Collapse flyout' }
                              )
                        }
                        display="block"
                      >
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.observabilityAiAssistant.chatActionsMenu.euiButtonIcon.toggleFlyoutWidthModeLabel',
                            { defaultMessage: 'Toggle flyout width mode' }
                          )}
                          data-test-subj="observabilityAiAssistantChatHeaderButton"
                          iconType={flyoutWidthMode === 'side' ? 'expand' : 'minimize'}
                          onClick={handleToggleFlyoutWidthMode}
                        />
                      </EuiToolTip>
                    }
                  />
                </EuiFlexItem>
              </>
            ) : null}

            <EuiFlexItem grow={false}>
              <ChatActionsMenu
                connectors={connectors}
                conversationId={conversationId}
                disabled={licenseInvalid}
                showLinkToConversationsApp={showLinkToConversationsApp}
                onCopyConversationClick={onCopyConversation}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
