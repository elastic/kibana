/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantAvatar } from '../assistant_avatar';
import { ChatActionsMenu } from './chat_actions_menu';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

// needed to prevent InlineTextEdit component from expanding container
const minWidthClassName = css`
  min-width: 0;
`;

const chatHeaderClassName = css`
  padding-top: 12px;
  padding-bottom: 12px;
`;

export function ChatHeader({
  title,
  loading,
  licenseInvalid,
  connectors,
  conversationId,
  showLinkToConversationsApp,
  onCopyConversation,
  onSaveTitle,
}: {
  title: string;
  loading: boolean;
  licenseInvalid: boolean;
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  showLinkToConversationsApp: boolean;
  onCopyConversation: () => void;
  onSaveTitle: (title: string) => void;
}) {
  const theme = useEuiTheme();

  const [newTitle, setNewTitle] = useState(title);

  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const chatActionsMenuWrapper = css`
    position: absolute;
    right: 46px;
  `;

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
        <EuiFlexItem
          grow={false}
          className={showLinkToConversationsApp ? chatActionsMenuWrapper : ''}
        >
          <ChatActionsMenu
            connectors={connectors}
            conversationId={conversationId}
            disabled={licenseInvalid}
            showLinkToConversationsApp={showLinkToConversationsApp}
            onCopyConversationClick={onCopyConversation}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
