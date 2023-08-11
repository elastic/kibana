/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Message } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantRouter } from '../../hooks/use_observability_ai_assistant_router';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { ChatBody } from './chat_body';

const containerClassName = css`
  max-height: 100%;
`;

export function ChatFlyout({
  title,
  messages,
  conversationId,
  isOpen,
  onClose,
  onChatUpdate,
  onChatComplete,
}: {
  title: string;
  messages: Message[];
  conversationId?: string;
  isOpen: boolean;
  onClose: () => void;
  onChatUpdate?: (messages: Message[]) => void;
  onChatComplete?: (messages: Message[]) => void;
}) {
  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  const {
    services: { http },
  } = useKibana();

  const service = useObservabilityAIAssistant();

  const { euiTheme } = useEuiTheme();

  const router = useObservabilityAIAssistantRouter();

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
                href={router.link('/conversations/{conversationId}', {
                  path: { conversationId },
                })}
              >
                {i18n.translate('xpack.observabilityAiAssistant.conversationDeepLinkLabel', {
                  defaultMessage: 'Open conversation',
                })}
              </EuiLink>
            ) : (
              <EuiLink href={router.link('/conversations/new')}>
                {i18n.translate('xpack.observabilityAiAssistant.conversationListDeepLinkLabel', {
                  defaultMessage: 'Go to conversations',
                })}
              </EuiLink>
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <ChatBody
            service={service}
            connectors={connectors}
            title={title}
            messages={messages}
            currentUser={currentUser}
            connectorsManagementHref={getConnectorsManagementHref(http)}
            onChatUpdate={(nextMessages) => {
              if (onChatUpdate) {
                onChatUpdate(nextMessages);
              }
            }}
            onChatComplete={(nextMessages) => {
              if (onChatComplete) {
                onChatComplete(nextMessages);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  ) : null;
}
