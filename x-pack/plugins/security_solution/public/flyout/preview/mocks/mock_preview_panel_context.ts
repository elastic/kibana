/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockDataAsNestedObject } from '../../shared/mocks/mock_context';
import type { PreviewPanelContext } from '../context';

/**
 * Mock contextValue for right panel context
 */
export const mockContextValue: PreviewPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  ruleId: '',
  indexPattern: { fields: [], title: 'test index' },
  dataAsNestedObject: mockDataAsNestedObject as unknown as Ecs,
};
