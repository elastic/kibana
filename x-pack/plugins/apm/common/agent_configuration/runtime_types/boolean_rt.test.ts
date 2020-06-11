/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { booleanRt } from './boolean_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('booleanRt', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(booleanRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['true', 'false'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(booleanRt.decode(input))).toBe(true);
      });
    });
  });
});
