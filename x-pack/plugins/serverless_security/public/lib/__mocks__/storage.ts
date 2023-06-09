/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export let mockStorageData: Record<string, unknown> = {};
export const clearMockStorageData = () => {
  mockStorageData = {};
};
const mockStorage = {
  get: jest.fn((key: string) => mockStorageData[key]),
  set: jest.fn((key, value) => {
    mockStorageData[key] = value;
  }),
};

export const storage = mockStorage;
