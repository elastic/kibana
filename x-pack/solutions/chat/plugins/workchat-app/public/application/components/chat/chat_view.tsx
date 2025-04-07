/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ConversationEventChanges } from '../../../../common/chat_events';
import { Chat } from './chat';
import { ChatHeader } from './chat_header';
import { ConversationList } from './conversation_list';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useConversationList } from '../../hooks/use_conversation_list';
import { useKibana } from '../../hooks/use_kibana';
import { useAgent } from '../../hooks/use_agent';

const newConversationId = 'new';

const pageSectionContentClassName = css`
  width: 100%;
  display: flex;
  flex-grow: 1;
  padding-top: 0;
  padding-bottom: 0;
  height: 100%;
  max-block-size: calc(100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)));
`;

interface WorkchatChatViewProps {
  agentId: string;
  conversationId: string | undefined;
}

export const WorkchatChatView: React.FC<WorkchatChatViewProps> = ({ agentId, conversationId }) => {
  const {
    services: { application },
  } = useKibana();

  const currentUser = useCurrentUser();

  const { agent } = useAgent({ agentId });
  const { conversations, refresh: refreshConversations } = useConversationList({ agentId });

  const onConversationUpdate = useCallback(
    (changes: ConversationEventChanges) => {
      if (!conversationId) {
        application.navigateToApp('workchat', { path: `/agents/${agentId}/chat/${changes.id}` });
      }
      refreshConversations();
    },
    [agentId, application, conversationId, refreshConversations]
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
      <KibanaPageTemplate.Sidebar paddingSize="none">
        <ConversationList
          conversations={conversations}
          activeConversationId={conversationId}
          onConversationSelect={(newConvId) => {
            application.navigateToApp('workchat', { path: `/agents/${agentId}/chat/${newConvId}` });
          }}
          onNewConversationSelect={() => {
            application.navigateToApp('workchat', {
              path: `/agents/${agentId}/chat/${newConversationId}`,
            });
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
          <ChatHeader connectorId={connectorId} agent={agent} onConnectorChange={setConnectorId} />
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
