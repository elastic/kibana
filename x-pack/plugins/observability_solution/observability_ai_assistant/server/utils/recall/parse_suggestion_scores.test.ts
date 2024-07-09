/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { parseSuggestionScores } from './parse_suggestion_scores';

describe('parseSuggestionScores', () => {
  it('parses newlines as separators', () => {
    expect(
      parseSuggestionScores(
        dedent(
          `my-id,1
      my-other-id,7
      my-another-id,10`
        )
      )
    ).toEqual([
      {
        id: 'my-id',
        score: 1,
      },
      {
        id: 'my-other-id',
        score: 7,
      },
      {
        id: 'my-another-id',
        score: 10,
      },
    ]);
  });

  it('parses semi-colons as separators', () => {
    expect(parseSuggestionScores(`idone,1;idtwo,7;idthree,10`)).toEqual([
      {
        id: 'idone',
        score: 1,
      },
      {
        id: 'idtwo',
        score: 7,
      },
      {
        id: 'idthree',
        score: 10,
      },
    ]);
  });

  it('parses spaces as separators', () => {
    expect(parseSuggestionScores(`a,1 b,7 c,10`)).toEqual([
      {
        id: 'a',
        score: 1,
      },
      {
        id: 'b',
        score: 7,
      },
      {
        id: 'c',
        score: 10,
      },
    ]);
  });
});
