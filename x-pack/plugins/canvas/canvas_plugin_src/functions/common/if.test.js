/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { ifFn } from './if';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  let testScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

  describe('spec', () => {
    it('is a function', () => {
      expect(typeof fn).toBe('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn(null, { condition: true, then: () => of('foo') })).toBe('(0|)', [
            'foo',
          ]);

          expectObservable(
            fn(null, { condition: true, then: () => of('foo'), else: () => of('bar') })
          ).toBe('(0|)', ['foo']);
        });
      });

      it('without then', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn(null, { condition: true })).toBe('(0|)', [null]);
          expectObservable(fn('some context', { condition: true })).toBe('(0|)', ['some context']);
        });
      });
    });

    describe('condition failed', () => {
      it('with else', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(
            fn('some context', {
              condition: false,
              then: () => of('foo'),
              else: () => of('bar'),
            })
          ).toBe('(0|)', ['bar']);
        });
      });

      it('without else', () => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn('some context', { condition: false, then: () => of('foo') })).toBe(
            '(0|)',
            ['some context']
          );
        });
      });
    });

    describe('falsy values', () => {
      // eslint-disable-next-line no-unsanitized/method
      it.each`
        value
        ${null}
        ${false}
        ${0}
      `('for then with $value', ({ value }) => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn('some context', { condition: true, then: () => of(value) })).toBe(
            '(0|)',
            [value]
          );
        });
      });

      // eslint-disable-next-line no-unsanitized/method
      it.each`
        value
        ${null}
        ${false}
        ${0}
      `('for else with $value', ({ value }) => {
        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn('some context', { condition: false, else: () => of(value) })).toBe(
            '(0|)',
            [value]
          );
        });
      });
    });
  });

  // TODO: Passing through context
});
