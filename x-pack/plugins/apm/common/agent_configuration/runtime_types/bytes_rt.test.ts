/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBytesRt } from './bytes_rt';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

describe('bytesRt', () => {
  describe('must accept any amount and unit', () => {
    const bytesRt = getBytesRt({});
    describe('it should not accept', () => {
      ['mb', 1, '1', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should accept', () => {
      ['-1b', '0mb', '1b', '2kb', '3mb', '1000mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('must be at least 0b', () => {
    const bytesRt = getBytesRt({
      min: '0b',
    });

    describe('it should not accept', () => {
      ['mb', '-1kb', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should return correct error message', () => {
      ['-1kb', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = bytesRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be greater than 0b');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });

    describe('it should accept', () => {
      ['1b', '2kb', '3mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('must be between 500b and 1kb', () => {
    const bytesRt = getBytesRt({
      min: '500b',
      max: '1kb',
    });
    describe('it should not accept', () => {
      ['mb', '-1b', '1b', '499b', '1025b', '2kb', '1mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(false);
        });
      });
    });
    describe('it should return correct error message', () => {
      ['-1b', '1b', '499b', '1025b', '2kb', '1mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = bytesRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be between 500b and 1kb');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['500b', '1024b', '1kb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(bytesRt.decode(input))).toBe(true);
        });
      });
    });
  });
});
