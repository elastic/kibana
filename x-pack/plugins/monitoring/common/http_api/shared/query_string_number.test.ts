/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts';
import { numberFromStringRT } from './query_string_number';

describe('NumberFromString runtime type', () => {
  it('decodes strings to numbers', () => {
    expect(numberFromStringRT.decode('123')).toEqual(either.right(123));
    expect(numberFromStringRT.decode('0')).toEqual(either.right(0));
  });

  it('rejects when not a number', () => {
    expect(either.isLeft(numberFromStringRT.decode(''))).toBeTruthy();
    expect(either.isLeft(numberFromStringRT.decode('ab12'))).toBeTruthy();
  });
});
