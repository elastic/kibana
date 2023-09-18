/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SearchHit } from '../../../../common/search_strategy';
import type { RightPanelContext } from '../context';
import {
  mockDataAsNestedObject,
  mockDataFormattedForFieldBrowser,
  mockGetFieldsData,
  mockSearchHit,
} from './mock_context';

/**
 * Mock contextValue for right panel context
 */
export const mockContextValue: RightPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  getFieldsData: mockGetFieldsData,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  browserFields: {},
  dataAsNestedObject: mockDataAsNestedObject as unknown as Ecs,
  searchHit: mockSearchHit as unknown as SearchHit,
  investigationFields: [],
  refetchFlyoutData: jest.fn(),
};
