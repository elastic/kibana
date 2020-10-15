/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { ifFn } from './if';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(typeof fn).toBe('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', async () => {
        expect(await fn(null, { condition: true, then: () => 'foo' })).toBe('foo');
        expect(await fn(null, { condition: true, then: () => 'foo', else: () => 'bar' })).toBe(
          'foo'
        );
      });

      it('without then', async () => {
        expect(await fn(null, { condition: true })).toBe(null);
        expect(await fn('some context', { condition: true })).toBe('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', async () =>
        expect(
          await fn('some context', { condition: false, then: () => 'foo', else: () => 'bar' })
        ).toBe('bar'));

      it('without else', async () =>
        expect(await fn('some context', { condition: false, then: () => 'foo' })).toBe(
          'some context'
        ));
    });

    describe('falsy values', () => {
      describe('for then', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: true, then: () => null })).toBe(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: true, then: () => false })).toBe(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: true, then: () => 0 })).toBe(0));
      });

      describe('for else', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: false, else: () => null })).toBe(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: false, else: () => false })).toBe(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: false, else: () => 0 })).toBe(0));
      });
    });
  });

  // TODO: Passing through context
});
