/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createCustomPipeline } from './create_custom_pipeline_api_logic';

describe('createCustomPipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomPipeline', () => {
    it('calls correct pipeline route', async () => {
      const responsePromise = Promise.resolve({ created: ['my-custom-pipeline'] });
      http.post.mockReturnValue(responsePromise);
      const result = await createCustomPipeline({ indexName: 'indexName' });

      await nextTick();

      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/indexName/pipelines'
      );

      expect(result).toEqual({ created: ['my-custom-pipeline'] });
    });
  });
});
