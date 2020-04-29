/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBytesRt } from './bytes_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('bytesRt', () => {
  const bytesRt = getBytesRt({
    min: 0,
    units: ['b', 'mb', 'kb']
  });

  describe('it should not accept', () => {
    ['mb', '-1kb', '5gb', '6tb'].map(input => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(bytesRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['1b', '2kb', '3mb'].map(input => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(bytesRt.decode(input))).toBe(true);
      });
    });
  });
});
