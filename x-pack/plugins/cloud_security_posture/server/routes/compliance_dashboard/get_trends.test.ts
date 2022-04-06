/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTrendsFromQueryResult, ScoreTrendDoc } from './get_trends';

const trendDocs: ScoreTrendDoc[] = [
  {
    '@timestamp': '2022-04-06T15:00:00Z',
    total_findings: 40,
    passed_findings: 25,
    failed_findings: 15,
    score_by_cluster_id: {
      first_cluster_id: {
        total_findings: 20,
        passed_findings: 10,
        failed_findings: 10,
      },
      second_cluster_id: {
        total_findings: 20,
        passed_findings: 15,
        failed_findings: 5,
      },
    },
  },
  {
    '@timestamp': '2022-04-06T15:30:00Z',
    total_findings: 20,
    passed_findings: 5,
    failed_findings: 15,
    score_by_cluster_id: {
      third_cluster_id: {
        total_findings: 20,
        passed_findings: 5,
        failed_findings: 15,
      },
    },
  },
  {
    '@timestamp': '2022-04-05T15:30:00Z',
    total_findings: 30,
    passed_findings: 25,
    failed_findings: 5,
    score_by_cluster_id: {
      forth_cluster_id: {
        total_findings: 25,
        passed_findings: 25,
        failed_findings: 0,
      },
      fifth_cluster_id: {
        total_findings: 5,
        passed_findings: 0,
        failed_findings: 5,
      },
    },
  },
];

describe('getTrendsFromQueryResult', () => {
  it('should return value matching Trends type definition, in descending order, and with postureScore', async () => {
    const trends = getTrendsFromQueryResult(trendDocs);
    expect(trends).toEqual([
      {
        timestamp: '2022-04-05T15:30:00Z',
        summary: {
          totalFindings: 30,
          totalPassed: 25,
          totalFailed: 5,
          postureScore: 83.3,
        },
        clusters: {
          forth_cluster_id: {
            totalFindings: 25,
            totalPassed: 25,
            totalFailed: 0,
            postureScore: 100.0,
          },
          fifth_cluster_id: {
            totalFindings: 5,
            totalPassed: 0,
            totalFailed: 5,
            postureScore: 0,
          },
        },
      },
      {
        timestamp: '2022-04-06T15:00:00Z',
        summary: {
          totalFindings: 40,
          totalPassed: 25,
          totalFailed: 15,
          postureScore: 62.5,
        },
        clusters: {
          first_cluster_id: {
            totalFindings: 20,
            totalPassed: 10,
            totalFailed: 10,
            postureScore: 50.0,
          },
          second_cluster_id: {
            totalFindings: 20,
            totalPassed: 15,
            totalFailed: 5,
            postureScore: 75.0,
          },
        },
      },
      {
        timestamp: '2022-04-06T15:30:00Z',
        summary: {
          totalFindings: 20,
          totalPassed: 5,
          totalFailed: 15,
          postureScore: 25.0,
        },
        clusters: {
          third_cluster_id: {
            totalFindings: 20,
            totalPassed: 5,
            totalFailed: 15,
            postureScore: 25.0,
          },
        },
      },
    ]);
  });
});
