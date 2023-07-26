/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { ObservabilityAIAssistantPageTemplate } from '../components/page_template';
import { ConversationView } from './conversations/conversation_view';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const observabilityAIAssistantRoutes = {
  '/': {
    element: <Redirect to="/conversations" />,
    params: t.type({}),
  },
  '/conversations': {
    element: (
      <ObservabilityAIAssistantPageTemplate>
        <Outlet />
      </ObservabilityAIAssistantPageTemplate>
    ),
    params: t.type({}),
    children: {
      '/conversations/new': {
        params: t.type({}),
        element: <ConversationView />,
      },
      '/conversations': {
        params: t.type({}),
        element: <></>,
      },
    },
  },
};

export type ObservabilityAIAssistantRoutes = typeof observabilityAIAssistantRoutes;

export const observabilityAIAssistantRouter = createRouter(observabilityAIAssistantRoutes);

export type ObservabilityAIAssistantRouter = typeof observabilityAIAssistantRouter;
