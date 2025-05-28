/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { WorkChatHomePage } from './pages/home';
import { WorkchatChatPage } from './pages/chat';
import { WorkChatAssistantsPage } from './pages/assistants';
import { WorkChatAssistantOverviewPage } from './pages/assistant_details';
import { WorkChatIntegrationsPage } from './pages/integrations';
import { WorkChatIntegrationEditOrCreatePage } from './pages/integration_edit_or_create';
import { WorkChatAssistantWorkflowPage } from './pages/assistant_workflow';
import { WorkChatCatalogPage } from './pages/integrations_catalog';
export const WorkchatAppRoutes: React.FC<{}> = () => {
  return (
    <Routes>
      <Route path="/assistants/:agentId/chat/:conversationId">
        <WorkchatChatPage />
      </Route>
      <Route path="/assistants/:agentId/chat">
        <WorkchatChatPage />
      </Route>

      <Route path="/assistants/create" strict>
        <WorkChatAssistantOverviewPage />
      </Route>
      <Route path="/assistants/:agentId/edit" strict>
        <WorkChatAssistantOverviewPage />
      </Route>
      <Route path="/assistants/:agentId/workflow" strict>
        <WorkChatAssistantWorkflowPage />
      </Route>
      <Route path="/assistants" strict>
        <WorkChatAssistantsPage />
      </Route>

      <Route path="/tools/create">
        <WorkChatIntegrationEditOrCreatePage />
      </Route>
      <Route path="/tools/catalog">
        <WorkChatCatalogPage />
      </Route>
      <Route path="/tools/:integrationId">
        <WorkChatIntegrationEditOrCreatePage />
      </Route>
      <Route path="/tools" strict>
        <WorkChatIntegrationsPage />
      </Route>

      <Route path="/">
        <WorkChatHomePage />
      </Route>
    </Routes>
  );
};
