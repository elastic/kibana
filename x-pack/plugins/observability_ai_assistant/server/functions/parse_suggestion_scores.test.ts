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
          `0,1
      2,7
      3,10`
        )
      )
    ).toEqual([
      {
        index: 0,
        score: 1,
      },
      {
        index: 2,
        score: 7,
      },
      {
        index: 3,
        score: 10,
      },
    ]);
  });

  it('parses semi-colons as separators', () => {
    expect(parseSuggestionScores(`0,1;2,7;3,10`)).toEqual([
      {
        index: 0,
        score: 1,
      },
      {
        index: 2,
        score: 7,
      },
      {
        index: 3,
        score: 10,
      },
    ]);
  });

  it('parses spaces as separators', () => {
    expect(parseSuggestionScores(`0,1 2,7 3,10`)).toEqual([
      {
        index: 0,
        score: 1,
      },
      {
        index: 2,
        score: 7,
      },
      {
        index: 3,
        score: 10,
      },
    ]);
  });
});
