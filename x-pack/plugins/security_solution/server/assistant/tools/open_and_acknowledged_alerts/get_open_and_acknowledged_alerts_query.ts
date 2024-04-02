/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getOpenAndAcknowledgedAlertsQuery = ({
  alertsIndexPattern,
  allow,
  size,
}: {
  alertsIndexPattern: string;
  allow: string[];
  size: number;
}) => ({
  allow_no_indices: true,
  body: {
    fields: allow.map((field) => ({
      field,
      include_unmapped: true,
    })),
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          'kibana.alert.workflow_status': 'open',
                        },
                      },
                      {
                        match_phrase: {
                          'kibana.alert.workflow_status': 'acknowledged',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-24h',
                      lte: 'now',
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
    size,
    sort: [
      {
        'kibana.alert.risk_score': {
          order: 'desc',
        },
      },
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: false,
  },
  ignore_unavailable: true,
  index: [alertsIndexPattern],
});
