/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseRecommendationsHook } from './use_recommendations';

export const createUseRecommendationsHookMock = (): jest.Mocked<UseRecommendationsHook> =>
  jest.fn(() => ({
    recommendations: undefined,
    loading: false,
    error: undefined,
    applyRecommendation: jest.fn(),
    isApplyingRecommendation: false,
  }));
