/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getAlertsQueryFromRiskScore } from './get_alerts_query_from_risk_score';
import { RiskSeverity } from '../../../common/search_strategy/security_solution/risk_score/all';

const risk = {
  calculated_level: RiskSeverity.critical,
  calculated_score_norm: 70,
  rule_risks: [],
  multipliers: [],
};

describe('getAlertsQueryFromRiskScore', () => {
  it('should return query from host risk score', () => {
    expect(
      getAlertsQueryFromRiskScore({
        riskScore: {
          host: {
            name: 'host-1',
            risk,
          },
          '@timestamp': '2023-08-10T14:00:00.000Z',
        },
        from: 'now-30d',
      })
    ).toEqual({
      _source: false,
      size: 1000,
      fields: ['*'],
      query: {
        bool: {
          filter: [
            { term: { 'host.name': 'host-1' } },
            { range: { '@timestamp': { gte: 'now-30d', lte: '2023-08-10T14:00:00.000Z' } } },
          ],
        },
      },
    });
  });

  it('should return query from user risk score', () => {
    expect(
      getAlertsQueryFromRiskScore({
        riskScore: {
          user: {
            name: 'user-1',
            risk,
          },
          '@timestamp': '2023-08-10T14:00:00.000Z',
        },
        from: 'now-30d',
      })
    ).toEqual({
      _source: false,
      size: 1000,
      fields: ['*'],
      query: {
        bool: {
          filter: [
            { term: { 'user.name': 'user-1' } },
            { range: { '@timestamp': { gte: 'now-30d', lte: '2023-08-10T14:00:00.000Z' } } },
          ],
        },
      },
    });
  });

  it('should return query with custom fields', () => {
    const query = getAlertsQueryFromRiskScore({
      riskScore: {
        user: {
          name: 'user-1',
          risk,
        },
        '@timestamp': '2023-08-10T14:00:00.000Z',
      },
      from: 'now-30d',
      fields: ['event.category', 'event.action'],
    });
    expect(query.fields).toEqual(['event.category', 'event.action']);
  });
});
