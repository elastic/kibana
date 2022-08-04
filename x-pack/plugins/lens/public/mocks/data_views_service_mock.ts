/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternServiceAPI } from '../indexpattern_service/service';

export function createIndexPatternServiceMock(): IndexPatternServiceAPI {
  return {
    loadIndexPatterns: jest.fn(async () => ({})),
    loadIndexPatternRefs: jest.fn(async () => []),
    ensureIndexPattern: jest.fn(async () => ({})),
    refreshExistingFields: jest.fn(async () => {}),
    getDefaultIndex: jest.fn(() => 'fake-index'),
    updateIndexPatternsCache: jest.fn(async () => {}),
  };
}
