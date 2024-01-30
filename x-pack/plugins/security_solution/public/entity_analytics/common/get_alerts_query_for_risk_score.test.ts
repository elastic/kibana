/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getAlertsQueryForRiskScore } from './get_alerts_query_for_risk_score';
import type { RiskStats } from '../../../common/search_strategy/security_solution/risk_score/all';
import { RiskSeverity } from '../../../common/search_strategy/security_solution/risk_score/all';

const risk: RiskStats = {
  calculated_level: RiskSeverity.critical,
  calculated_score_norm: 70,
  rule_risks: [],
  multipliers: [],
  '@timestamp': '',
  id_field: '',
  id_value: '',
  calculated_score: 0,
  category_1_score: 0,
  category_1_count: 0,
  category_2_score: 0,
  category_2_count: 0,
  notes: [],
  inputs: [],
};

describe('getAlertsQueryForRiskScore', () => {
  it('should return query from host risk score', () => {
    expect(
      getAlertsQueryForRiskScore({
        riskScore: {
          host: {
            name: 'host-1',
            risk,
          },
          '@timestamp': '2023-08-10T14:00:00.000Z',
        },
        riskRangeStart: 'now-30d',
      })
    ).toEqual({
      _source: false,
      size: 1000,
      fields: ['*'],
      query: {
        bool: {
          filter: [
            { term: { 'host.name': 'host-1' } },
            {
              range: {
                '@timestamp': { gte: '2023-07-11T14:00:00.000Z', lte: '2023-08-10T14:00:00.000Z' },
              },
            },
          ],
        },
      },
    });
  });

  it('should return query from user risk score', () => {
    expect(
      getAlertsQueryForRiskScore({
        riskScore: {
          user: {
            name: 'user-1',
            risk,
          },
          '@timestamp': '2023-08-10T14:00:00.000Z',
        },
        riskRangeStart: 'now-30d',
      })
    ).toEqual({
      _source: false,
      size: 1000,
      fields: ['*'],
      query: {
        bool: {
          filter: [
            { term: { 'user.name': 'user-1' } },
            {
              range: {
                '@timestamp': { gte: '2023-07-11T14:00:00.000Z', lte: '2023-08-10T14:00:00.000Z' },
              },
            },
          ],
        },
      },
    });
  });

  it('should return query with custom fields', () => {
    const query = getAlertsQueryForRiskScore({
      riskScore: {
        user: {
          name: 'user-1',
          risk,
        },
        '@timestamp': '2023-08-10T14:00:00.000Z',
      },
      riskRangeStart: 'now-30d',
      fields: ['event.category', 'event.action'],
    });
    expect(query.fields).toEqual(['event.category', 'event.action']);
  });
});
