/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';
import { mlModelStats } from '../../__mocks__/ml_models.mock';

import { getMLModelsStats } from './ml_model_stats_logic';

describe('MLModelsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getMLModelsStats', () => {
    it('calls the ml api', async () => {
      http.get.mockResolvedValue(mlModelStats);
      const result = await getMLModelsStats();
      expect(http.get).toHaveBeenCalledWith('/api/ml/trained_models/_stats');
      expect(result).toEqual(mlModelStats);
    });
  });
});
