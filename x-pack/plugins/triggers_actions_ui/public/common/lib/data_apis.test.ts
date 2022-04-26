/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loadIndexPatterns,
  setSavedObjectsClient,
  getMatchingIndices,
  getESIndexFields,
} from './data_apis';
import { httpServiceMock } from '@kbn/core/public/mocks';

const mockFind = jest.fn();
const perPage = 1000;
const http = httpServiceMock.createStartContract();
const pattern = 'test-pattern';
const indexes = ['test-index'];

const generateIndexPattern = (title: string) => ({
  attributes: {
    title,
  },
});

const mockIndices = { indices: ['indices1', 'indices2'] };
const mockFields = {
  fields: [
    { name: 'name', type: 'type', normalizedType: 'nType', searchable: true, aggregatable: false },
  ],
};

const mockPattern = 'test-pattern';

describe('Data API', () => {
  describe('index fields', () => {
    test('fetches index fields', async () => {
      http.post.mockResolvedValueOnce(mockFields);
      const fields = await getESIndexFields({ indexes, http });

      expect(http.post).toHaveBeenCalledWith('/api/triggers_actions_ui/data/_fields', {
        body: `{"indexPatterns":${JSON.stringify(indexes)}}`,
      });
      expect(fields).toEqual(mockFields.fields);
    });
  });

  describe('matching indices', () => {
    test('fetches indices', async () => {
      http.post.mockResolvedValueOnce(mockIndices);
      const indices = await getMatchingIndices({ pattern, http });

      expect(http.post).toHaveBeenCalledWith('/api/triggers_actions_ui/data/_indices', {
        body: `{"pattern":"*${mockPattern}*"}`,
      });
      expect(indices).toEqual(mockIndices.indices);
    });

    test('returns empty array if fetch fails', async () => {
      http.post.mockRejectedValueOnce(500);
      const indices = await getMatchingIndices({ pattern, http });
      expect(indices).toEqual([]);
    });
  });

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

    test('returns an empty array if one of the requests fails', async () => {
      mockFind.mockResolvedValueOnce({
        savedObjects: [generateIndexPattern('index-1'), generateIndexPattern('index-2')],
        total: 1010,
      });
      mockFind.mockRejectedValueOnce(500);

      const results = await loadIndexPatterns(mockPattern);

      expect(results).toEqual([]);
    });
  });
});
