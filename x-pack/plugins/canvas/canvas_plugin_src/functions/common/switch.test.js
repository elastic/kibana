/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
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
  const nonMatchingCases = mockCases.filter((c) => !c.matches);

  describe('spec', () => {
    it('is a function', () => {
      expect(typeof fn).toBe('function');
    });
  });

  describe('function', () => {
    describe('with no cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';
        expect(fn(context, {})).resolves.toBe(context);
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = { default: () => of('bar') };
        expect(fn(context, args)).resolves.toBe('bar');
      });
    });

    describe('with no matching cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';
        const args = { case: nonMatchingCases.map(getter) };
        expect(fn(context, args)).resolves.toBe(context);
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = {
          case: nonMatchingCases.map(getter),
          default: () => of('bar'),
        };
        expect(fn(context, args)).resolves.toBe('bar');
      });
    });

    describe('with matching cases', () => {
      it('should return the first match', async () => {
        const context = 'foo';
        const args = { case: mockCases.map(getter) };
        const firstMatch = mockCases.find((c) => c.matches);
        expect(fn(context, args)).resolves.toBe(firstMatch.result);
      });
    });
  });
});
