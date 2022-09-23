/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringToObjectFormatter } from './common';

describe('common formatters', () => {
  it.each([
    ['', undefined],
    ['{', undefined],
    ['{}', undefined],
    ['{"some": "json"}', { some: 'json' }],
  ])('formats strings to objects correctly, avoiding errors', (input, expected) => {
    expect(stringToObjectFormatter(input)).toEqual(expected);
  });
});
