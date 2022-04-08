/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertsItem, SeverityRuleAlertsAggsResponse } from './rule_alerts_items';

export const from = '2022-04-05T12:00:00.000Z';
export const to = '2022-04-08T12:00:00.000Z';

export const severityRuleAlertsQuery = {
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { 'kibana.alert.workflow_status': 'open' } },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    alertsByRule: {
      terms: {
        // top 4 rules sorted by severity counters
        field: 'kibana.alert.rule.uuid',
        size: 4,
        order: [{ critical: 'desc' }, { high: 'desc' }, { medium: 'desc' }, { low: 'desc' }],
      },
      aggs: {
        // severity aggregations for sorting
        critical: { filter: { term: { 'kibana.alert.severity': 'critical' } } },
        high: { filter: { term: { 'kibana.alert.severity': 'high' } } },
        medium: { filter: { term: { 'kibana.alert.severity': 'medium' } } },
        low: { filter: { term: { 'kibana.alert.severity': 'low' } } },
        // get the newest alert to extract timestamp and rule name
        lastRuleAlert: {
          top_hits: {
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
      },
    },
  },
};

export const mockSeverityRuleAlertsResponse: { aggregations: SeverityRuleAlertsAggsResponse } = {
  aggregations: {
    alertsByRule: {
      buckets: [
        {
          key: '79ec0270-b4c5-11ec-970e-8f7c5a7144f7',
          doc_count: 54,
          lastRuleAlert: {
            hits: {
              total: {
                value: 54,
              },
              hits: [
                {
                  _source: {
                    'kibana.alert.rule.name': 'RULE_1',
                    '@timestamp': '2022-04-05T15:58:35.079Z',
                    'kibana.alert.severity': 'critical',
                  },
                },
              ],
            },
          },
        },
        {
          key: '955c79d0-b403-11ec-b5a7-6dc1ed01bdd7',
          doc_count: 112,
          lastRuleAlert: {
            hits: {
              total: {
                value: 112,
              },
              hits: [
                {
                  _source: {
                    'kibana.alert.rule.name': 'RULE_2',
                    '@timestamp': '2022-04-05T15:58:47.164Z',
                    'kibana.alert.severity': 'high',
                  },
                },
              ],
            },
          },
        },
        {
          key: '13bc7bc0-b1d6-11ec-a799-67811b37527a',
          doc_count: 170,
          lastRuleAlert: {
            hits: {
              total: {
                value: 170,
              },
              hits: [
                {
                  _source: {
                    'kibana.alert.rule.name': 'RULE_3',
                    '@timestamp': '2022-04-05T15:56:16.606Z',
                    'kibana.alert.severity': 'low',
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
};

export const severityRuleAlertsResponseParsed: RuleAlertsItem[] = [
  {
    alert_count: 54,
    id: '79ec0270-b4c5-11ec-970e-8f7c5a7144f7',
    last_alert_at: '2022-04-05T15:58:35.079Z',
    name: 'RULE_1',
    severity: 'critical',
  },
  {
    alert_count: 112,
    id: '955c79d0-b403-11ec-b5a7-6dc1ed01bdd7',
    last_alert_at: '2022-04-05T15:58:47.164Z',
    name: 'RULE_2',
    severity: 'high',
  },
  {
    alert_count: 170,
    id: '13bc7bc0-b1d6-11ec-a799-67811b37527a',
    last_alert_at: '2022-04-05T15:56:16.606Z',
    name: 'RULE_3',
    severity: 'low',
  },
];
