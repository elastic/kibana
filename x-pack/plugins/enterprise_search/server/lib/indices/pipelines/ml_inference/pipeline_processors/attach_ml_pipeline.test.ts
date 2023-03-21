/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../../utils/create_ml_inference_pipeline', () => ({
  addSubPipelineToIndexSpecificMlPipeline: jest.fn(() => {
    return Promise.resolve({ addedToParentPipeline: true, id: 'pipeline-id' });
  }),
}));

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { addSubPipelineToIndexSpecificMlPipeline } from '../../../../../utils/create_ml_inference_pipeline';

import { attachMlInferencePipeline } from './attach_ml_pipeline';

describe('attachMlInferencePipeline lib function', () => {
  const mockClient = {} as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls addSubPipelineToIndexSpecificMlPipeline util', async () => {
    const result = await attachMlInferencePipeline('indexName', 'pipeline-name', mockClient);
    expect(result).toEqual({
      addedToParentPipeline: true,
      id: 'pipeline-id',
    });

    expect(addSubPipelineToIndexSpecificMlPipeline).toHaveBeenCalledWith(
      'indexName',
      'pipeline-name',
      mockClient
    );
  });
});
