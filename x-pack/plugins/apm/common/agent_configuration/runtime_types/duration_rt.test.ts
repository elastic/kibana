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

import { durationRt } from './duration_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('durationRt', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false, '100', 's', 'm', '0h'].map(
      input => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(durationRt.decode(input))).toBe(false);
        });
      }
    );
  });

  describe('It should accept', () => {
    ['1s', '2m', '3h'].map(input => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(durationRt.decode(input))).toBe(true);
      });
    });
  });
});
