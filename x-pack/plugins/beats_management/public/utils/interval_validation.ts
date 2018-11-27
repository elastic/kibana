/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const isIntervalSuffix = (token: string) => /([1-9][0-9]*['h' | 'm' | 's'])$/.test(token);

const tokenize = (value: string) =>
  value.split(' ').reduce((acc: string[], cur: string) => {
    if (cur !== '') {
      return acc.concat(cur);
    }
    return acc;
  }, []);

export const parseInterval = (input: string): boolean => {
  const tokens = tokenize(input);
  if (tokens.length === 2 && tokens[0] === '@every' && isIntervalSuffix(tokens[1])) {
    return true;
  }
  return false;
};
