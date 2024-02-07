/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MockStorage {
  data: Record<string, unknown>;
  clearMockStorageData: () => void;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

const mockStorage: MockStorage = {
  data: {},
  clearMockStorageData: () => {
    mockStorage.data = {};
  },
  get: jest.fn((key: string) => mockStorage.data[key]),
  set: jest.fn((key, value) => {
    mockStorage.data[key] = value;
  }),
};

export const storage = mockStorage;
