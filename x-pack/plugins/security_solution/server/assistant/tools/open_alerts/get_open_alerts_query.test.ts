/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOpenAlertsQuery } from './get_open_alerts_query';

describe('getOpenAlertsQuery', () => {
  it('returns the expected query', () => {
    const alertsIndexPattern = 'alerts-*';
    const allow = ['field1', 'field2'];
    const size = 10;

    const query = getOpenAlertsQuery({ alertsIndexPattern, allow, size });

    expect(query).toEqual({
      allow_no_indices: true,
      body: {
        fields: [
          { field: 'field1', include_unmapped: true },
          { field: 'field2', include_unmapped: true },
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [],
                  filter: [
                    {
                      match_phrase: {
                        'kibana.alert.workflow_status': 'open',
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: 'now-1d/d',
                          lte: 'now/d',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                  ],
                  should: [],
                  must_not: [
                    {
                      exists: {
                        field: 'kibana.alert.building_block_type',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        runtime_mappings: {},
        size: 10,
        sort: [
          { 'kibana.alert.risk_score': { order: 'desc' } },
          { '@timestamp': { order: 'desc' } },
        ],
        _source: false,
      },
      ignore_unavailable: true,
      index: ['alerts-*'],
    });
  });
});
