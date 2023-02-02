/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';
import { mlModels } from '../../__mocks__/ml_models.mock';

import { getMLModels } from './ml_models_logic';

describe('MLModelsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getMLModels', () => {
    it('calls the ml api', async () => {
      http.get.mockResolvedValue(mlModels);
      const result = await getMLModels();
      expect(http.get).toHaveBeenCalledWith('/api/ml/trained_models', {
        query: { size: 1000, with_pipelines: true },
      });
      expect(result).toEqual(mlModels);
    });
  });
});
