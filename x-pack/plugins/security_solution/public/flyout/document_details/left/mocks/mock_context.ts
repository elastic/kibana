/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields } from '../../shared/mocks/mock_browser_fields';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataAsNestedObject } from '../../shared/mocks/mock_data_as_nested_object';
import type { LeftPanelContext } from '../context';

/**
 * Mock contextValue for left panel context
 */
export const mockContextValue: LeftPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  browserFields: mockBrowserFields,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: mockGetFieldsData,
  searchHit: mockSearchHit,
  dataAsNestedObject: mockDataAsNestedObject,
  investigationFields: [],
  isPreview: false,
};
