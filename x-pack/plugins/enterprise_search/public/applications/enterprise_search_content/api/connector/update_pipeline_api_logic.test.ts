/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { updatePipeline } from './update_pipeline_api_logic';

describe('updatePipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updatePipeline', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const pipeline = {
        extract_binary_content: true,
        name: 'pipelineName',
        reduce_whitespace: false,
        run_ml_inference: true,
      };
      const result = updatePipeline({ connectorId: 'connector_id', pipeline });
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connector_id/pipeline',
        {
          body: JSON.stringify(pipeline),
        }
      );
      await expect(result).resolves.toEqual({ connectorId: 'connector_id', pipeline });
    });
  });
});
