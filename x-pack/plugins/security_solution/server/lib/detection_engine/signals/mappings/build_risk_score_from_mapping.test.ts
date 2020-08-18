/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from '../__mocks__/es_results';
import { buildRiskScoreFromMapping } from './build_risk_score_from_mapping';

describe('buildRiskScoreFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('risk score defaults to provided if mapping is incomplete', () => {
    const riskScore = buildRiskScoreFromMapping({
      doc: sampleDocNoSortId(),
      riskScore: 57,
      riskScoreMapping: undefined,
    });

    expect(riskScore).toEqual({ riskScore: 57, riskScoreMeta: {} });
  });

  // TODO: Enhance...
});
