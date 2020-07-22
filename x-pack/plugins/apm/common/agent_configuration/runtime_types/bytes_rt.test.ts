/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bytesRt } from './bytes_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('bytesRt', () => {
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
      'mb',
      '0kb',
      '5gb',
      '6tb',
    ].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(bytesRt.decode(input))).toBe(false);
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
