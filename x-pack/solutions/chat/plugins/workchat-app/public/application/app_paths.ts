/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single source of truth for all url building logic in the app.
 */
export const appPaths = {
  home: '/',

  chat: {
    new: ({ agentId }: { agentId: string }) => `/agents/${agentId}/chat`,
    conversation: ({ agentId, conversationId }: { agentId: string; conversationId: string }) =>
      `/agents/${agentId}/chat/${conversationId}`,
  },

  agents: {
    list: '/agents',
    create: '/agents/create',
    edit: ({ agentId }: { agentId: string }) => `/agents/${agentId}/edit`,
  },

  integrations: {
    list: '/integrations',
    create: '/integrations/create',
    edit: ({ integrationId }: { integrationId: string }) => `/integrations/${integrationId}/edit`,
  },
};
