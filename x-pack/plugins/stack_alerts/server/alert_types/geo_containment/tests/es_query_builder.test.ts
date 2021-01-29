/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEsFormattedQuery } from '../es_query_builder';

describe('esFormattedQuery', () => {
  it('lucene queries are converted correctly', async () => {
    const testLuceneQuery1 = {
      query: `"airport": "Denver"`,
      language: 'lucene',
    };
    const esFormattedQuery1 = getEsFormattedQuery(testLuceneQuery1);
    expect(esFormattedQuery1).toStrictEqual({ query_string: { query: '"airport": "Denver"' } });
    const testLuceneQuery2 = {
      query: `title:"Fun with turnips" AND text:Cabbage, cabbage and more cabbage!`,
      language: 'lucene',
    };
    const esFormattedQuery2 = getEsFormattedQuery(testLuceneQuery2);
    expect(esFormattedQuery2).toStrictEqual({
      query_string: {
        query: `title:"Fun with turnips" AND text:Cabbage, cabbage and more cabbage!`,
      },
    });
  });

  it('kuery queries are converted correctly', async () => {
    const testKueryQuery1 = {
      query: `"airport": "Denver"`,
      language: 'kuery',
    };
    const esFormattedQuery1 = getEsFormattedQuery(testKueryQuery1);
    expect(esFormattedQuery1).toStrictEqual({
      bool: { minimum_should_match: 1, should: [{ match_phrase: { airport: 'Denver' } }] },
    });
    const testKueryQuery2 = {
      query: `"airport": "Denver" and ("animal": "goat" or "animal": "narwhal")`,
      language: 'kuery',
    };
    const esFormattedQuery2 = getEsFormattedQuery(testKueryQuery2);
    expect(esFormattedQuery2).toStrictEqual({
      bool: {
        filter: [
          { bool: { should: [{ match_phrase: { airport: 'Denver' } }], minimum_should_match: 1 } },
          {
            bool: {
              should: [
                {
                  bool: { should: [{ match_phrase: { animal: 'goat' } }], minimum_should_match: 1 },
                },
                {
                  bool: {
                    should: [{ match_phrase: { animal: 'narwhal' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });
});
