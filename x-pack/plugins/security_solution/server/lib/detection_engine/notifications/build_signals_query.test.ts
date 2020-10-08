/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildSignalsSearchQuery } from './build_signals_query';

describe('buildSignalsSearchQuery', () => {
  it('returns proper query object', () => {
    const index = 'index';
    const ruleId = 'ruleId-12';
    const from = '123123123';
    const to = '1123123123';

    expect(
      buildSignalsSearchQuery({
        index,
        from,
        to,
        ruleId,
      })
    ).toEqual({
      index,
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: {
                    match: {
                      'signal.rule.rule_id': ruleId,
                    },
                  },
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
  });
});
