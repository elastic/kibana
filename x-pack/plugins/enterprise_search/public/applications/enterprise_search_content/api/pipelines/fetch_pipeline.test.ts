/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchPipeline } from './fetch_pipeline';

describe('FetchPipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchIndex', () => {
    it('calls correct api', async () => {
      const response = {
        'pipeline-name': {},
      };
      const promise = Promise.resolve(response);
      http.get.mockReturnValue(promise);
      const result = fetchPipeline({ pipelineName: 'pipeline-name' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/pipelines/pipeline-name');
      await expect(result).resolves.toEqual(response);
    });
  });
});
