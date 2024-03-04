/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function parseSuggestionScores(scoresAsString: string) {
  // make sure that spaces, semi-colons etc work as separators as well
  const scores = scoresAsString
    .replace(/[^0-9,]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [index, score] = pair.split(',').map((str) => parseInt(str, 10));

      return {
        index,
        score,
      };
    });

  return scores;
}
