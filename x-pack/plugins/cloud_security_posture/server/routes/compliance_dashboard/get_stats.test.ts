/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindingsEvaluationsQueryResult,
  getStatsFromFindingsEvaluationsAggs,
  roundScore,
} from './get_stats';
import { calculatePostureScore } from '../../../common/utils/helpers';

const standardQueryResult: FindingsEvaluationsQueryResult = {
  resources_evaluated: {
    value: 30,
  },
  failed_findings: {
    doc_count: 30,
  },
  passed_findings: {
    doc_count: 11,
  },
};

const oneIsZeroQueryResult: FindingsEvaluationsQueryResult = {
  resources_evaluated: {
    value: 30,
  },
  failed_findings: {
    doc_count: 0,
  },
  passed_findings: {
    doc_count: 11,
  },
};

const bothAreZeroQueryResult: FindingsEvaluationsQueryResult = {
  resources_evaluated: {
    value: 0,
  },
  failed_findings: {
    doc_count: 0,
  },
  passed_findings: {
    doc_count: 0,
  },
};

describe('roundScore', () => {
  it('should return decimal values with one fraction digit', async () => {
    const rounded = roundScore(0.85245);
    expect(rounded).toEqual(85.2);
  });
});

describe('calculatePostureScore', () => {
  it('should return calculated posture score', async () => {
    const score = calculatePostureScore(4, 7);
    expect(score).toEqual(36.4);
  });
});

describe('getStatsFromFindingsEvaluationsAggs', () => {
  it('should throw error in case no findings were found', async () => {
    const score = calculatePostureScore(4, 7);
    expect(score).toEqual(36.4);
  });

  it('should return value matching ComplianceDashboardData["stats"]', async () => {
    const stats = getStatsFromFindingsEvaluationsAggs(standardQueryResult);
    expect(stats).toEqual({
      totalFailed: 30,
      totalPassed: 11,
      totalFindings: 41,
      postureScore: 26.8,
      resourcesEvaluated: 30,
    });
  });

  it('checks for stability in case one of the values is zero', async () => {
    const stats = getStatsFromFindingsEvaluationsAggs(oneIsZeroQueryResult);
    expect(stats).toEqual({
      totalFailed: 0,
      totalPassed: 11,
      totalFindings: 11,
      postureScore: 100.0,
      resourcesEvaluated: 30,
    });
  });

  it('should return zero on all stats if there are no failed or passed findings', async () => {
    const stats = getStatsFromFindingsEvaluationsAggs(bothAreZeroQueryResult);
    expect(stats).toEqual({
      totalFailed: 0,
      totalPassed: 0,
      totalFindings: 0,
      postureScore: 0,
    });
  });
});
