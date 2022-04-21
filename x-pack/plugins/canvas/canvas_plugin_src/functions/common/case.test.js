/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { caseFn } from './case';

describe('case', () => {
  let testScheduler;
  const fn = functionWrapper(caseFn);

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected));
  });

  describe('spec', () => {
    it('is a function', () => {
      expect(typeof fn).toBe('function');
    });
  });

  describe('function', () => {
    describe('no if or value', () => {
      it('should return the result if provided', () => {
        const context = null;
        const args = {
          then: () => of('foo'),
        };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', [
            {
              type: 'case',
              matches: true,
              result: 'foo',
            },
          ])
        );
      });
    });

    describe('with if', () => {
      it('should return as the matches prop', () => {
        const context = null;
        const args = { if: false };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', [
            {
              type: 'case',
              matches: args.if,
              result: context,
            },
          ])
        );
      });
    });

    describe('with value', () => {
      it('should return whether it matches the context as the matches prop', () => {
        const args = {
          when: () => of('foo'),
          then: () => of('bar'),
        };

        testScheduler.run(({ expectObservable }) => {
          expectObservable(fn('foo', args)).toBe('(0|)', [
            {
              type: 'case',
              matches: true,
              result: 'bar',
            },
          ]);

          expectObservable(fn('bar', args)).toBe('(0|)', [
            {
              type: 'case',
              matches: false,
              result: null,
            },
          ]);
        });
      });
    });

    describe('with if and value', () => {
      it('should return the if as the matches prop', () => {
        const context = null;
        const args = {
          when: () => 'foo',
          if: false,
        };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', [
            {
              type: 'case',
              matches: args.if,
              result: context,
            },
          ])
        );
      });
    });
  });
});
