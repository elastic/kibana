/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsePipelineSimulatorHook } from './use_pipeline_simulator';

export const createUseRecommendationsHookMock = (): jest.Mocked<UsePipelineSimulatorHook> =>
  jest.fn(() => ({
    simulation: undefined,
    loading: false,
    error: undefined,
    simulate: jest.fn(),
  }));
