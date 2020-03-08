/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transactionMaxSpansRt } from './transaction_max_spans_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('transactionMaxSpans', () => {
  it('does not accept empty values', () => {
    expect(isRight(transactionMaxSpansRt.decode(undefined))).toBe(false);
    expect(isRight(transactionMaxSpansRt.decode(null))).toBe(false);
    expect(isRight(transactionMaxSpansRt.decode(''))).toBe(false);
  });

  it('should only accept stringified numbers', () => {
    expect(isRight(transactionMaxSpansRt.decode('55'))).toBe(true);
    expect(isRight(transactionMaxSpansRt.decode(55))).toBe(false);
    expect(isRight(transactionMaxSpansRt.decode('foo'))).toBe(false);
  });

  it('checks if the number falls within 0, 32000', () => {
    expect(isRight(transactionMaxSpansRt.decode('0'))).toBe(true);
    expect(isRight(transactionMaxSpansRt.decode('1000'))).toBe(true);
    expect(isRight(transactionMaxSpansRt.decode('32000'))).toBe(true);
    expect(isRight(transactionMaxSpansRt.decode('-55'))).toBe(false);
    expect(isRight(transactionMaxSpansRt.decode('33000'))).toBe(false);
    expect(isRight(transactionMaxSpansRt.decode(NaN))).toBe(false);
  });
});
