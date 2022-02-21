/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadIndexPatterns, setSavedObjectsClient } from './data_apis';

const mockFind = jest.fn();
const perPage = 1000;

const generateIndexPattern = (title: string) => ({
  attributes: {
    title,
  },
});

const mockPattern = 'test-pattern';

describe('index patterns', () => {
  beforeEach(() => {
    setSavedObjectsClient({
      find: mockFind,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches the index patterns', async () => {
    mockFind.mockResolvedValueOnce({
      savedObjects: [generateIndexPattern('index-1'), generateIndexPattern('index-2')],
      total: 2,
    });
    const results = await loadIndexPatterns(mockPattern);

    expect(mockFind).toBeCalledTimes(1);
    expect(mockFind).toBeCalledWith({
      fields: ['title'],
      page: 1,
      perPage,
      search: '*test-pattern*',
      type: 'index-pattern',
    });
    expect(results).toEqual(['index-1', 'index-2']);
  });

  test(`fetches the index patterns as chunks and merges them, if the total number of index patterns more than ${perPage}`, async () => {
    mockFind.mockResolvedValueOnce({
      savedObjects: [generateIndexPattern('index-1'), generateIndexPattern('index-2')],
      total: 2010,
    });
    mockFind.mockResolvedValueOnce({
      savedObjects: [generateIndexPattern('index-3'), generateIndexPattern('index-4')],
      total: 2010,
    });
    mockFind.mockResolvedValueOnce({
      savedObjects: [generateIndexPattern('index-5'), generateIndexPattern('index-6')],
      total: 2010,
    });
    const results = await loadIndexPatterns(mockPattern);

    expect(mockFind).toBeCalledTimes(3);
    expect(mockFind).toHaveBeenNthCalledWith(1, {
      fields: ['title'],
      page: 1,
      perPage,
      search: '*test-pattern*',
      type: 'index-pattern',
    });
    expect(mockFind).toHaveBeenNthCalledWith(2, {
      fields: ['title'],
      page: 2,
      perPage,
      search: '*test-pattern*',
      type: 'index-pattern',
    });
    expect(mockFind).toHaveBeenNthCalledWith(3, {
      fields: ['title'],
      page: 3,
      perPage,
      search: '*test-pattern*',
      type: 'index-pattern',
    });
    expect(results).toEqual(['index-1', 'index-2', 'index-3', 'index-4', 'index-5', 'index-6']);
  });
});
