/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ConversationEventChanges } from '../../../../common/chat_events';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useConversationList } from '../../hooks/use_conversation_list';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../app_paths';
import { ConversationPanel } from './conversations_panel/conversation_panel';
import { ChatHeader } from './header_bar/chat_header';
import { Chat } from './chat';

interface WorkchatChatViewProps {
  agentId: string;
  conversationId: string | undefined;
}

export const WorkchatChatView: React.FC<WorkchatChatViewProps> = ({ agentId, conversationId }) => {
  const { navigateToWorkchatUrl } = useNavigation();

  const { euiTheme } = useEuiTheme();

  const pageSectionContentClassName = css`
    width: 100%;
    display: flex;
    flex-grow: 1;
    padding-top: 0;
    padding-bottom: 0;
    height: 100%;
    max-block-size: var(--kbn-application--content-height);
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const currentUser = useCurrentUser();
  const { conversations, refresh: refreshConversations } = useConversationList({ agentId });

  const onConversationUpdate = useCallback(
    (changes: ConversationEventChanges) => {
      if (!conversationId) {
        navigateToWorkchatUrl(appPaths.chat.conversation({ agentId, conversationId: changes.id }));
      }
      refreshConversations();
    },
    [agentId, conversationId, refreshConversations, navigateToWorkchatUrl]
  );

  const [connectorId, setConnectorId] = useState<string>();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="workchatPageChat"
      grow={false}
      panelled={false}
    >
      <KibanaPageTemplate.Sidebar paddingSize="none" minWidth={280}>
        <ConversationPanel
          agentId={agentId}
          conversations={conversations}
          activeConversationId={conversationId}
          onConversationSelect={(newConvId) => {
            navigateToWorkchatUrl(
              appPaths.chat.conversation({ agentId, conversationId: newConvId })
            );
          }}
          onNewConversationSelect={() => {
            navigateToWorkchatUrl(appPaths.chat.new({ agentId }));
          }}
        />
      </KibanaPageTemplate.Sidebar>

      <KibanaPageTemplate.Section paddingSize="none" grow contentProps={{ css: 'height: 100%' }}>
        <EuiFlexGroup
          className={pageSectionContentClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
          responsive={false}
        >
          <ChatHeader
            connectorId={connectorId}
            conversationId={conversationId}
            onConnectorChange={setConnectorId}
          />
          <Chat
            agentId={agentId}
            conversationId={conversationId}
            connectorId={connectorId}
            currentUser={currentUser}
            onConversationUpdate={onConversationUpdate}
          />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
