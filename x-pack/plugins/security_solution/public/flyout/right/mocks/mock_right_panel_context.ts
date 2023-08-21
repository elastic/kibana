/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RightPanelContext } from '../context';
import { mockDataFormattedForFieldBrowser, mockGetFieldsData } from './mock_context';

/**
 * Mock contextValue for right panel context
 */
export const mockContextValue: RightPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  getFieldsData: mockGetFieldsData,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  browserFields: null,
  dataAsNestedObject: null,
  searchHit: undefined,
  investigationFields: [],
  refetchFlyoutData: jest.fn(),
};
