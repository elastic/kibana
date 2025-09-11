/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useAgentList } from '../hooks/use_agent_list';
import { AssistantListView } from '../components/assistant/list/assistant_list_view';

export const WorkChatAssistantsPage: React.FC<{}> = () => {
  useBreadcrumb([{ text: 'Assistants' }]);
  const { agents } = useAgentList();
  return <AssistantListView agents={agents} />;
};
