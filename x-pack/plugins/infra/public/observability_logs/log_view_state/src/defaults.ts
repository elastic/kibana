/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_LOG_VIEW_ID = 'default';
export const DEFAULT_LOG_VIEW = {
  type: 'log-view-reference' as const,
  logViewId: DEFAULT_LOG_VIEW_ID,
};
