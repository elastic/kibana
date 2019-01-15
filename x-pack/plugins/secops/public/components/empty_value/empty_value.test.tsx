/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultToEmpty, getEmptyValue, getOrEmpty } from '.';

describe('EmptyValue', () => {
  describe('#getEmptyValue', () =>
    it('should return an empty value', () => expect(getEmptyValue()).toBe('--')));

  describe('#getOr', () => {
    it('should default empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    it('should default empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    it('should default empty value when a deep rooted value is missing', () => {
      const test = {
        a: {
          b: {},
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    it('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(1);
    });
  });

  describe('#defaultToEmpty', () => {
    it('should default to an empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(getEmptyValue());
    });

    it('should default to an empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(getEmptyValue());
    });

    it('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(1);
    });
  });
});
