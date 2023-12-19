/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAlertsCountQuery = (alertsIndexPattern: string) => ({
  aggs: {
    statusBySeverity: {
      terms: {
        field: 'kibana.alert.severity',
      },
    },
  },
  index: [alertsIndexPattern],
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
