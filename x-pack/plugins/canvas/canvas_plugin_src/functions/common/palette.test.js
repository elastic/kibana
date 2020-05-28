/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { palettes } from '../../../common/lib/palettes';
import { palette } from './palette';

describe('palette', () => {
  const fn = functionWrapper(palette);

  it('results a palette', () => {
    const result = fn(null);
    expect(result).toHaveProperty('type', 'palette');
  });

  describe('args', () => {
    describe('color', () => {
      it('sets colors', () => {
        const result = fn(null, { color: ['red', 'green', 'blue'] });
        expect(result.colors).toEqual(['red', 'green', 'blue']);
      });

      it('defaults to pault_tor_14 colors', () => {
        const result = fn(null);
        expect(result.colors).toEqual(palettes.paul_tor_14.colors);
      });
    });

    describe('gradient', () => {
      it('sets gradient', () => {
        let result = fn(null, { gradient: true });
        expect(result).toHaveProperty('gradient', true);

        result = fn(null, { gradient: false });
        expect(result).toHaveProperty('gradient', false);
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result).toHaveProperty('gradient', false);
      });
    });

    describe('reverse', () => {
      it('reverses order of the colors', () => {
        const result = fn(null, { reverse: true });
        expect(result.colors).toEqual(palettes.paul_tor_14.colors.reverse());
      });

      it('keeps the original order of the colors', () => {
        const result = fn(null, { reverse: false });
        expect(result.colors).toEqual(palettes.paul_tor_14.colors);
      });

      it(`defaults to 'false`, () => {
        const result = fn(null);
        expect(result.colors).toEqual(palettes.paul_tor_14.colors);
      });
    });
  });
});
