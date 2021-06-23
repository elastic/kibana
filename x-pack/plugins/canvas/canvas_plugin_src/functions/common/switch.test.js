/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { functionWrapper } from '../../../test_helpers/function_wrapper';
import { switchFn } from './switch';

describe('switch', () => {
  const fn = functionWrapper(switchFn);
  const getter = (value) => () => of(value);
  const mockCases = [
    {
      type: 'case',
      matches: false,
      result: 1,
    },
    {
      type: 'case',
      matches: false,
      result: 2,
    },
    {
      type: 'case',
      matches: true,
      result: 3,
    },
    {
      type: 'case',
      matches: false,
      result: 4,
    },
    {
      type: 'case',
      matches: true,
      result: 5,
    },
  ];
  const nonMatchingCases = mockCases.filter(({ matches }) => !matches);

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
    describe('with no cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, {})).toBe('(0|)', [context])
        );
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = { default: () => of('bar') };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', ['bar'])
        );
      });
    });

    describe('with no matching cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';
        const args = { case: nonMatchingCases.map(getter) };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', [context])
        );
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = {
          case: nonMatchingCases.map(getter),
          default: () => of('bar'),
        };

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', ['bar'])
        );
      });
    });

    describe('with matching cases', () => {
      it('should return the first match', () => {
        const context = 'foo';
        const args = { case: mockCases.map(getter) };
        const { result } = mockCases.find(({ matches }) => matches);

        testScheduler.run(({ expectObservable }) =>
          expectObservable(fn(context, args)).toBe('(0|)', [result])
        );
      });
    });
  });
});
