/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { getMLModels } from './ml_models_logic';

describe('MLModelsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getMLModels', () => {
    it('calls the ml api', async () => {
      const response: Promise<TrainedModelConfigResponse[]> = Promise.resolve([
        {
          inference_config: {},
          input: {
            field_names: [],
          },
          model_id: 'a-model-001',
          model_type: 'pytorch',
          tags: ['pytorch', 'ner'],
          version: '1',
        },
        {
          inference_config: {},
          input: {
            field_names: [],
          },
          model_id: 'a-model-002',
          model_type: 'lang_ident',
          tags: [],
          version: '2',
        },
      ]);
      http.get.mockReturnValue(response);
      const result = await getMLModels();
      expect(http.get).toHaveBeenCalledWith('/api/ml/trained_models', {
        query: { size: 1000, with_pipelines: true },
      });
      expect(result).toEqual([
        {
          inference_config: {},
          input: {
            field_names: [],
          },
          model_id: 'a-model-001',
          model_type: 'pytorch',
          tags: ['pytorch', 'ner'],
          version: '1',
        },
        {
          inference_config: {},
          input: {
            field_names: [],
          },
          model_id: 'a-model-002',
          model_type: 'lang_ident',
          tags: [],
          version: '2',
        },
      ]);
    });
  });
});
