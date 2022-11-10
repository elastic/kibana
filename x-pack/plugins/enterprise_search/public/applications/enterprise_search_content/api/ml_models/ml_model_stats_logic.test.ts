/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { getMLModelsStats, GetMlModelsStatsResponse } from './ml_model_stats_logic';

describe('MLModelsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getMLModelsStats', () => {
    it('calls the ml api', async () => {
      const response: GetMlModelsStatsResponse = {
        count: 1,
        trained_model_stats: [
          {
            inference_stats: {
              cache_miss_count: 0,
              failure_count: 0,
              inference_count: 100,
              missing_all_fields_count: 0,
              timestamp: 0,
            },
            model_id: 'unit-test',
            pipeline_count: 1,
          },
        ],
      };
      http.get.mockResolvedValue(response);
      const result = await getMLModelsStats();
      expect(http.get).toHaveBeenCalledWith('/api/ml/trained_models/_stats');
      expect(result).toEqual(response);
    });
  });
});
