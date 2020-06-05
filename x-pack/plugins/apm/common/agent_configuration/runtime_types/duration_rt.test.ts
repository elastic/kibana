/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDurationRt } from './duration_rt';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

describe('getDurationRt', () => {
  describe('must be at least 1m', () => {
    const customDurationRt = getDurationRt({ min: '1m' });
    describe('it should not accept', () => {
      [
        undefined,
        null,
        '',
        0,
        'foo',
        true,
        false,
        '0m',
        '-1m',
        '1ms',
        '1s',
      ].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeFalsy();
        });
      });
    });
    describe('it should return correct error message', () => {
      ['0m', '-1m', '1ms', '1s'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be greater than 1m');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['1m', '2m', '1000m'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeTruthy();
        });
      });
    });
  });

  describe('must be between 1ms and 1s', () => {
    const customDurationRt = getDurationRt({ min: '1ms', max: '1s' });

    describe('it should not accept', () => {
      [
        undefined,
        null,
        '',
        0,
        'foo',
        true,
        false,
        '-1s',
        '0s',
        '2s',
        '1001ms',
        '0ms',
        '-1ms',
        '0m',
        '1m',
      ].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeFalsy();
        });
      });
    });
    describe('it should return correct error message', () => {
      ['-1s', '0s', '2s', '1001ms', '0ms', '-1ms', '0m', '1m'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be between 1ms and 1s');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['1s', '1ms', '50ms', '1000ms'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeTruthy();
        });
      });
    });
  });
  describe('must be max 1m', () => {
    const customDurationRt = getDurationRt({ max: '1m' });

    describe('it should not accept', () => {
      [undefined, null, '', 0, 'foo', true, false, '2m', '61s', '60001ms'].map(
        (input) => {
          it(`${JSON.stringify(input)}`, () => {
            expect(isRight(customDurationRt.decode(input))).toBeFalsy();
          });
        }
      );
    });
    describe('it should return correct error message', () => {
      ['2m', '61s', '60001ms'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be less than 1m');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['1m', '0m', '-1m', '60s', '6000ms', '1ms', '1s'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeTruthy();
        });
      });
    });
  });
});
