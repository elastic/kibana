/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

import { getMlInferencePipelines } from './get_inference_pipelines';
import { getMlModelConfigsForModelIds } from '../indices/fetch_ml_inference_pipeline_processors';

jest.mock('../indices/fetch_ml_inference_pipeline_processors', () => ({ getMlModelConfigsForModelIds: jest.fn() }));

describe('getMlInferencePipelines', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if Machine Learning is disabled in the current space', () => {
    expect(() => getMlInferencePipelines(
      mockClient as unknown as ElasticsearchClient,
      undefined,
    )).rejects.toThrowError('Machine Learning is not enabled');
  });

  it('should fetch inference pipelines and redact inaccessible model IDs', async () => {
    function mockInferencePipeline(modelId: string) {
      return {
        processors: [
          {
            append: {}
          },
          {
            inference: {
              model_id: modelId,
            }
          },
          {
            remove: {}
          }
        ]
      }
    }

    const mockPipelines = {
      pipeline1: mockInferencePipeline('model1'),
      pipeline2: mockInferencePipeline('model2'),
      pipeline3: mockInferencePipeline('redactedModel3'),
    }

    const mockModelConfigs = {
      model1: {
        modelId: 'model1',
        trainedModelName: 'model1',
      },
      model2: {
        modelId: 'model2',
        trainedModelName: 'model2',
      },
      redactedModel3: {
        // Redacted (undefined) model ID
        trainedModelName: 'redactedModel3',
      },
    };

    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockPipelines));
    (getMlModelConfigsForModelIds as jest.Mock).mockImplementation(() => Promise.resolve(mockModelConfigs));

    const actualPipelines = await getMlInferencePipelines(
      mockClient as unknown as ElasticsearchClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect((actualPipelines['pipeline1'].processors as IngestProcessorContainer[])[1].inference?.model_id).toBeDefined();
    expect((actualPipelines['pipeline2'].processors as IngestProcessorContainer[])[1].inference?.model_id).toBeDefined();
    expect((actualPipelines['pipeline3'].processors as IngestProcessorContainer[])[1].inference?.model_id).toEqual(''); // Redacted model ID
    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: 'ml-inference-*'});
  });
});
