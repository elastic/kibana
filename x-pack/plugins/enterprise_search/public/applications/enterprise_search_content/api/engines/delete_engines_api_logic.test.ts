/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { deleteEngine } from './delete_engines_api_logic';

describe('deleteEngineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('deleteEngine', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve();
      http.post.mockReturnValue(promise);
      const result = deleteEngine({ engineName: 'deleteEngineName' });
      await nextTick();
      expect(http.delete).toHaveBeenCalledWith(
        '/internal/enterprise_search/engines/deleteEngineName'
      );
      await expect(result).resolves;
    });
  });
});
