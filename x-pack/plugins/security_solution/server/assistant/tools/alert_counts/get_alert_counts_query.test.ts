/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsCountQuery } from './get_alert_counts_query';

describe('getAlertsCountQuery', () => {
  it('returns the expected query', () => {
    const alertsIndexPattern = 'alerts-index-pattern';
    const query = getAlertsCountQuery(alertsIndexPattern);

    expect(query).toEqual({
      aggs: {
        statusBySeverity: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
      index: ['alerts-index-pattern'],
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'kibana.alert.workflow_status': 'open',
                    },
                  },
                ],
                must_not: [
                  {
                    exists: {
                      field: 'kibana.alert.building_block_type',
                    },
                  },
                ],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: 'now/d',
                  lte: 'now/d',
                },
              },
            },
          ],
        },
      },
      size: 0,
    });
  });
});
