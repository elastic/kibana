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
import { ConversationViewWithProps } from './conversations/conversation_view_with_props';
import { SearchAIAssistantPageTemplate } from '../page_template';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const searchAIAssistantRoutes = {
  '/': {
    element: <Redirect to="/conversations/new" />,
  },
  '/conversations': {
    element: (
      <SearchAIAssistantPageTemplate>
        <Outlet />
      </SearchAIAssistantPageTemplate>
    ),
    children: {
      '/conversations/new': {
        element: <ConversationViewWithProps />,
      },
      '/conversations/{conversationId}': {
        params: t.intersection([
          t.type({
            path: t.type({
              conversationId: t.string,
            }),
          }),
          t.partial({
            state: t.partial({
              prevConversationKey: t.string,
            }),
          }),
        ]),
        element: <ConversationViewWithProps />,
      },
      '/conversations': {
        element: <Redirect to="/conversations/new" />,
      },
    },
  },
};

export type SearchAIAssistantRoutes = typeof searchAIAssistantRoutes;

export const searchAIAssistantRouter = createRouter(searchAIAssistantRoutes);

export type SearchAIAssistantRouter = typeof searchAIAssistantRouter;
