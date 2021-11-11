/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_RULE_ID } from '@kbn/rule-data-utils';
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
                  should: [
                    {
                      match: {
                        'signal.rule.rule_id': ruleId,
                      },
                    },
                    {
                      match: {
                        [ALERT_RULE_RULE_ID]: ruleId,
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
  });
});
