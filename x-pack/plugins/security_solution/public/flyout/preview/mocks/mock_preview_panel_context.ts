/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreviewPanelContext } from '../context';

/**
 * Mock contextValue for right panel context
 */
export const mockContextValue: PreviewPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  ruleId: '',
};
