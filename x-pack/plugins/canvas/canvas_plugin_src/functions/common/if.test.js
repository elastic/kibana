/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { functionWrapper } from '../../../test_helpers/function_wrapper';
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
      it('with then', () => {
        expect(fn(null, { condition: true, then: () => of('foo') })).resolves.toBe('foo');
        expect(
          fn(null, { condition: true, then: () => of('foo'), else: () => of('bar') })
        ).resolves.toBe('foo');
      });

      it('without then', () => {
        expect(fn(null, { condition: true })).resolves.toBe(null);
        expect(fn('some context', { condition: true })).resolves.toBe('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', () =>
        expect(
          fn('some context', {
            condition: false,
            then: () => of('foo'),
            else: () => of('bar'),
          })
        ).resolves.toBe('bar'));

      it('without else', () =>
        expect(fn('some context', { condition: false, then: () => of('foo') })).resolves.toBe(
          'some context'
        ));
    });

    describe('falsy values', () => {
      describe('for then', () => {
        it('with null', () => {
          expect(fn('some context', { condition: true, then: () => of(null) })).resolves.toBe(null);
        });

        it('with false', () => {
          expect(fn('some context', { condition: true, then: () => of(false) })).resolves.toBe(
            false
          );
        });

        it('with 0', () => {
          expect(fn('some context', { condition: true, then: () => of(0) })).resolves.toBe(0);
        });
      });

      describe('for else', () => {
        it('with null', () => {
          expect(fn('some context', { condition: false, else: () => of(null) })).resolves.toBe(
            null
          );
        });

        it('with false', () => {
          expect(fn('some context', { condition: false, else: () => of(false) })).resolves.toBe(
            false
          );
        });

        it('with 0', () => {
          expect(fn('some context', { condition: false, else: () => of(0) })).resolves.toBe(0);
        });
      });
    });
  });

  // TODO: Passing through context
});
