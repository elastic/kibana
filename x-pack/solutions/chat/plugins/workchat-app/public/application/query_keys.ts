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
  dataSources: {
    list: ['dataSources', 'list'] as const,
    byId: (id: string) => ['dataSources', id] as const,
  },
  dataConnections: {
    list: ['dataConnections', 'list'] as const,
    byId: (id: string) => ['dataConnections', id] as const,
  },
};
