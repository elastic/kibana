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
  workflowBuilder: {
    new: () => `/workflow-builder/new`,
    edit: ({ workflowId }: { workflowId: string }) => `/workflow-builder/${workflowId}/edit`,
  },
};
