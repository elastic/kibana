/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { compare } from './compare';

const errors = getFunctionErrors().compare;

describe('compare', () => {
  const fn = functionWrapper(compare);

  describe('args', () => {
    describe('op', () => {
      it('sets the operator', () => {
        expect(fn(0, { op: 'lt', to: 1 })).toBe(true);
      });

      it("defaults to 'eq'", () => {
        expect(fn(0, { to: 1 })).toBe(false);
        expect(fn(0, { to: 0 })).toBe(true);
      });

      it('throws when invalid op is provided', () => {
        expect(() => fn(1, { op: 'boo', to: 2 })).toThrowError(
          new RegExp(errors.invalidCompareOperator('boo').message)
        );
        expect(() => fn(1, { op: 'boo' })).toThrowError(
          new RegExp(errors.invalidCompareOperator('boo').message)
        );
      });
    });

    describe('to', () => {
      it('sets the value that context is compared to', () => {
        expect(fn(0, { to: 1 })).toBe(false);
      });

      it('if not provided, ne returns true while every other operator returns false', () => {
        expect(fn(null, { op: 'ne' })).toBe(true);
        expect(fn(0, { op: 'ne' })).toBe(true);
        expect(fn(true, { op: 'lte' })).toBe(false);
        expect(fn(1, { op: 'gte' })).toBe(false);
        expect(fn('foo', { op: 'lt' })).toBe(false);
        expect(fn(null, { op: 'gt' })).toBe(false);
        expect(fn(null, { op: 'eq' })).toBe(false);
      });
    });
  });

  describe('same type comparisons', () => {
    describe('null', () => {
      it('returns true', () => {
        expect(fn(null, { op: 'eq', to: null })).toBe(true);
        expect(fn(null, { op: 'lte', to: null })).toBe(true);
        expect(fn(null, { op: 'gte', to: null })).toBe(true);
      });

      it('returns false', () => {
        expect(fn(null, { op: 'ne', to: null })).toBe(false);
        expect(fn(null, { op: 'lt', to: null })).toBe(false);
        expect(fn(null, { op: 'gt', to: null })).toBe(false);
      });
    });

    describe('number', () => {
      it('returns true', () => {
        expect(fn(-2.34, { op: 'lt', to: 10 })).toBe(true);
        expect(fn(2, { op: 'gte', to: 2 })).toBe(true);
      });

      it('returns false', () => {
        expect(fn(2, { op: 'eq', to: 10 })).toBe(false);
        expect(fn(10, { op: 'ne', to: 10 })).toBe(false);
        expect(fn(1, { op: 'lte', to: -3 })).toBe(false);
        expect(fn(2, { op: 'gt', to: 2 })).toBe(false);
      });
    });

    describe('string', () => {
      it('returns true', () => {
        expect(fn('foo', { op: 'gte', to: 'foo' })).toBe(true);
        expect(fn('foo', { op: 'lte', to: 'foo' })).toBe(true);
        expect(fn('bar', { op: 'lt', to: 'foo' })).toBe(true);
      });

      it('returns false', () => {
        expect(fn('foo', { op: 'eq', to: 'bar' })).toBe(false);
        expect(fn('foo', { op: 'ne', to: 'foo' })).toBe(false);
        expect(fn('foo', { op: 'gt', to: 'foo' })).toBe(false);
      });
    });

    describe('boolean', () => {
      it('returns true', () => {
        expect(fn(true, { op: 'eq', to: true })).toBe(true);
        expect(fn(false, { op: 'eq', to: false })).toBe(true);
        expect(fn(true, { op: 'ne', to: false })).toBe(true);
        expect(fn(false, { op: 'ne', to: true })).toBe(true);
      });
      it('returns false', () => {
        expect(fn(true, { op: 'eq', to: false })).toBe(false);
        expect(fn(false, { op: 'eq', to: true })).toBe(false);
        expect(fn(true, { op: 'ne', to: true })).toBe(false);
        expect(fn(false, { op: 'ne', to: false })).toBe(false);
      });
    });
  });

  describe('different type comparisons', () => {
    it("returns true for 'ne' only", () => {
      expect(fn(0, { op: 'ne', to: '0' })).toBe(true);
    });

    it('otherwise always returns false', () => {
      expect(fn(0, { op: 'eq', to: '0' })).toBe(false);
      expect(fn('foo', { op: 'lt', to: 10 })).toBe(false);
      expect(fn('foo', { op: 'lte', to: true })).toBe(false);
      expect(fn(0, { op: 'gte', to: null })).toBe(false);
      expect(fn(0, { op: 'eq', to: false })).toBe(false);
      expect(fn(true, { op: 'gte', to: null })).toBe(false);
    });
  });
});
