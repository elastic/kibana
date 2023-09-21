/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticModels } from './elastic_models_service';
import { type TrainedModelsApiService } from './ml_api_service/trained_models';

const getMockResponse = () => [
  {
    version: 1,
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
    name: '.elser_model_1',
  },
  {
    version: 2,
    default: true,
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: 'Elastic Learned Sparse EncodeR v2 (Tech Preview)',
    name: '.elser_model_2',
  },
  {
    version: 2,
    os: 'linux',
    arch: 'x86_64',
    config: {
      input: {
        field_names: ['text_field'],
      },
    },
    description: 'Elastic Learned Sparse EncodeR v2, x86-64 (Tech Preview)',
    name: '.elser_model_2_linux-x86_64',
    recommended: true,
  },
];

describe('ElasticModels', () => {
  const trainedModelsApi = {
    getTrainedModelDownloads: jest.fn(() => Promise.resolve(getMockResponse())),
  } as unknown as jest.Mocked<TrainedModelsApiService>;

  const elasticModel = new ElasticModels(trainedModelsApi);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ELSER', () => {
    test('provides a recommended definition by default', async () => {
      const result = await elasticModel.getELSER();
      expect(result.name).toEqual('.elser_model_2_linux-x86_64');
    });

    test('provides a default version if there is no recommended', async () => {
      trainedModelsApi.getTrainedModelDownloads.mockResolvedValueOnce([
        ...getMockResponse().splice(0, 2),
      ]);

      const result = await elasticModel.getELSER();
      expect(result.name).toEqual('.elser_model_2');
    });

    test('provides the requested version', async () => {
      const result = await elasticModel.getELSER({ version: 1 });
      expect(result.name).toEqual('.elser_model_1');
    });
  });
});
