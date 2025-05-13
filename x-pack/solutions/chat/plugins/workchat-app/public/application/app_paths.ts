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
    new: ({ agentId }: { agentId: string }) => `/assistants/${agentId}/chat`,
    conversation: ({ agentId, conversationId }: { agentId: string; conversationId: string }) =>
      `/assistants/${agentId}/chat/${conversationId}`,
  },
  assistants: {
    list: '/assistants',
    create: '/assistants/create',
    edit: ({ agentId }: { agentId: string }) => `/assistants/${agentId}/edit`,
    workflow: ({ agentId }: { agentId: string }) => `/assistants/${agentId}/workflow`,
  },

  tools: {
    list: '/tools',
    create: '/tools/create',
    catalog: '/tools/catalog',
    edit: ({ integrationId }: { integrationId: string }) => `/tools/${integrationId}/edit`,
  },
};
