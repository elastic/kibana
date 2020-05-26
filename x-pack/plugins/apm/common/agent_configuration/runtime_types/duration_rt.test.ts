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
      '-1ms',
    ].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(durationRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['1000ms', '2s', '3m', '1s'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(durationRt.decode(input))).toBe(true);
      });
    });
  });
});

describe('getDurationRt', () => {
  const customDurationRt = getDurationRt({ min: -1 });
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false, '100', 's', 'm', '-2ms'].map(
      (input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(customDurationRt.decode(input))).toBe(false);
        });
      }
    );
  });

  describe('it should accept', () => {
    ['1000ms', '2s', '3m', '1s', '-1s', '0ms'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(customDurationRt.decode(input))).toBe(true);
      });
    });
  });
});
