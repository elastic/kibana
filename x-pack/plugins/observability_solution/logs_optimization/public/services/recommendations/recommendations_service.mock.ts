/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRecommendationsClientMock } from './recommendations_client.mock';
import { IRecommendationsClient } from './types';

interface RecommendationsServiceStartMock {
  getClient: () => Promise<jest.Mocked<IRecommendationsClient>>;
}

export const createRecommendationsServiceStartMock =
  (): jest.Mocked<RecommendationsServiceStartMock> => ({
    getClient: jest.fn().mockResolvedValue(createRecommendationsClientMock()),
  });
