/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AgentEditView } from '../components/agents/edition/agent_edit_view';

const newAgentId = 'create';

export const WorkChatAgentEditOrCreatePage: React.FC<{}> = () => {
  const { agentId: agentIdFromParams } = useParams<{
    agentId: string;
  }>();

  const agentId = useMemo(() => {
    return agentIdFromParams === newAgentId ? undefined : agentIdFromParams;
  }, [agentIdFromParams]);

  return <AgentEditView agentId={agentId} />;
};
