/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface BuildSignalsSearchQuery {
  ruleId: string;
  index: string;
  from: string;
  to: string;
  size?: number;
}

export const buildSignalsSearchQuery = ({
  ruleId,
  index,
  from,
  to,
  size,
}: BuildSignalsSearchQuery) => ({
  index,
  body: {
    size,
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'signal.rule.rule_id': ruleId,
                  },
                },
                {
                  match: {
                    'kibana.alert.rule.rule_id': ruleId,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            range: {
              '@timestamp': {
                gt: from,
                lte: to,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
  },
});
