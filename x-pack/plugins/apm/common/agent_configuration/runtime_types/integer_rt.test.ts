/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { integerRt, getIntegerRt } from './integer_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('integerRt', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 'foo', 0, 55, NaN].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(integerRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['-1234', '-1', '0', '1000', '32000', '100000'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(integerRt.decode(input))).toBe(true);
      });
    });
  });
});

describe('getIntegerRt', () => {
  const customIntegerRt = getIntegerRt({ min: 0, max: 32000 });
  describe('it should not accept', () => {
    [undefined, null, '', 'foo', 0, 55, '-1', '-55', '33000', NaN].map(
      (input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customIntegerRt.decode(input))).toBe(false);
        });
      }
    );
  });

  describe('it should accept', () => {
    ['0', '1000', '32000'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(customIntegerRt.decode(input))).toBe(true);
      });
    });
  });
});
