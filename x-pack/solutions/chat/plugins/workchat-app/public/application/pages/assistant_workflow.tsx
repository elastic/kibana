/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { AssistantView } from '../components/assistant/details/assistant_view';

export const WorkChatAssistantWorkflowPage: React.FC<{}> = () => {
  const { agentId } = useParams<{
    agentId: string;
  }>();

  return <AssistantView agentId={agentId} selectedTab="workflow" />;
};
