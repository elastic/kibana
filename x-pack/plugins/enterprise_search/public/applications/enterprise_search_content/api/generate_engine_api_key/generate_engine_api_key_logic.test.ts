/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { generateEngineApiKey } from './generate_engine_api_key_logic';

describe('GenerateEngineApiKeyLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GenerateEngineApiKeyLogic', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({
        apiKey: {
          api_key: 'api_key',
          encoded: 'encoded',
          id: 'id',
          name: 'name',
        },
      });
      http.post.mockReturnValue(promise);
      const result = generateEngineApiKey({
        engineName: 'puggles',
        keyName: 'puggles read only key',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/engines/puggles/api_key',
        {
          body: JSON.stringify({
            keyName: 'puggles read only key',
          }),
        }
      );
      await expect(result).resolves.toEqual({
        apiKey: {
          api_key: 'api_key',
          encoded: 'encoded',
          id: 'id',
          name: 'name',
        },
      });
    });
  });
});
