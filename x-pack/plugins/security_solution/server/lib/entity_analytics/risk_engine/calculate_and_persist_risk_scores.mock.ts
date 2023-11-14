/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalculateAndPersistScoresResponse } from './types';

const buildResponseMock = (
  overrides: Partial<CalculateAndPersistScoresResponse> = {}
): CalculateAndPersistScoresResponse => ({
  after_keys: {
    host: { 'host.name': 'hostname' },
  },
  errors: [],
  scores_written: 2,
  ...overrides,
});

export const calculateAndPersistRiskScoresMock = {
  buildResponse: buildResponseMock,
};
