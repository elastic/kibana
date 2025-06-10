/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Query keys for react-query
 */
export const queryKeys = {
  workflows: {
    all: ['workflows'] as const,
    byId: (workflowId: string) => ['workflows', workflowId],
  },
};
