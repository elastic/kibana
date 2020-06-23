/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIntegerRt } from './integer_rt';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

describe('getIntegerRt', () => {
  describe('with range', () => {
    const integerRt = getIntegerRt({
      min: 0,
      max: 32000,
    });

    describe('it should not accept', () => {
      [NaN, undefined, null, '', 'foo', 0, 55, '-1', '-55', '33000'].map(
        (input) => {
          it(`${JSON.stringify(input)}`, () => {
            expect(isRight(integerRt.decode(input))).toBe(false);
          });
        }
      );
    });

    describe('it should return correct error message', () => {
      ['-1', '-55', '33000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = integerRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be between 0 and 32000');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });

    describe('it should accept number between 0 and 32000', () => {
      ['0', '1000', '32000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(integerRt.decode(input))).toBe(true);
        });
      });
    });
  });

  describe('without range', () => {
    const integerRt = getIntegerRt();

    describe('it should not accept', () => {
      [NaN, undefined, null, '', 'foo', 0, 55].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(integerRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should accept any number', () => {
      ['-100', '-1', '0', '1000', '32000', '100000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(integerRt.decode(input))).toBe(true);
        });
      });
    });
  });
});
