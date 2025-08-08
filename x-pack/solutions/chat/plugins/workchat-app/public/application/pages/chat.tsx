/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { WorkchatChatView } from '../components/chat/chat_view';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useAgent } from '../hooks/use_agent';

const newConversationId = 'new';

export const WorkchatChatPage: React.FC<{}> = () => {
  const { agentId, conversationId: conversationIdFromParams } = useParams<{
    agentId: string;
    conversationId: string | undefined;
  }>();

  const { agent } = useAgent({ agentId });

  useBreadcrumb([{ text: agent?.name ?? 'Agent' }, { text: 'Chat' }]);

  const conversationId = useMemo(() => {
    return conversationIdFromParams === newConversationId ? undefined : conversationIdFromParams;
  }, [conversationIdFromParams]);

  return <WorkchatChatView agentId={agentId} conversationId={conversationId} />;
};
