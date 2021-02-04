/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildLastAlertsQuery = (ruleId: string | undefined | null) => {
  const queryFilter = [
    {
      bool: { should: [{ match: { 'signal.status': 'open' } }], minimum_should_match: 1 },
    },
  ];

  return {
    aggs: {
      lastSeen: { max: { field: '@timestamp' } },
    },
    query: {
      bool: {
        filter:
          ruleId != null
            ? [
                ...queryFilter,
                {
                  bool: {
                    should: [{ match: { 'signal.rule.id': ruleId } }],
                    minimum_should_match: 1,
                  },
                },
              ]
            : queryFilter,
      },
    },
    size: 1,
    track_total_hits: true,
  };
};
