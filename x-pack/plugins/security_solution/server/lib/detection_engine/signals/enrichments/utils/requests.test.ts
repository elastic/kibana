/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeSingleFieldMathQuery } from './requests';

describe('makeSingleFieldMathQuery', () => {
  it('return empty query if events are empty', () => {
    expect(makeSingleFieldMathQuery([], 'enrichment.host.name')).toEqual({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: {
        bool: {
          should: [],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('return query to search for enrichments', () => {
    expect(
      makeSingleFieldMathQuery(['host name 1', 'host name 2'], 'enrichment.host.name')
    ).toEqual({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: {
        bool: {
          should: [
            {
              match: {
                'enrichment.host.name': {
                  query: 'host name 1',
                  minimum_should_match: 1,
                },
              },
            },
            {
              match: {
                'enrichment.host.name': {
                  query: 'host name 2',
                  minimum_should_match: 1,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });
});
