/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { durationRt, getDurationRt } from './duration_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('durationRt', () => {
  describe('it should not accept', () => {
    [
      undefined,
      null,
      '',
      0,
      'foo',
      true,
      false,
      '100',
      's',
      'm',
      '0ms',
      '-1ms'
    ].map(input => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(durationRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['1000ms', '2s', '3m', '1s'].map(input => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(durationRt.decode(input))).toBe(true);
      });
    });
  });
});

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
        '1s'
      ].map(input => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['1m', '2m', '1000m'].map(input => {
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
        '1m'
      ].map(input => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['1s', '1ms', '50ms', '1000ms'].map(input => {
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
        input => {
          it(`${JSON.stringify(input)}`, () => {
            expect(isRight(customDurationRt.decode(input))).toBeFalsy();
          });
        }
      );
    });
    describe('it should accept', () => {
      ['1m', '0m', '-1m', '60s', '6000ms', '1ms', '1s'].map(input => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBeTruthy();
        });
      });
    });
  });
});
