/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternServiceAPI } from '../data_views_service/service';

export function createIndexPatternServiceMock(): IndexPatternServiceAPI {
  return {
    loadIndexPatterns: jest.fn(),
    loadIndexPatternRefs: jest.fn(),
    ensureIndexPattern: jest.fn(),
    refreshExistingFields: jest.fn(),
    getDefaultIndex: jest.fn(),
    updateIndexPatternsCache: jest.fn(),
  };
}
