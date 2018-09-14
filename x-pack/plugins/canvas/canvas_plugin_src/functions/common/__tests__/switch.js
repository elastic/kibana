/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { switchFn } from '../switch';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('switch', () => {
  const fn = functionWrapper(switchFn);
  const getter = value => () => value;
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
  const nonMatchingCases = mockCases.filter(c => !c.matches);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('with no cases', () => {
      it('should return the context if no default is provided', async () => {
        const context = 'foo';
        expect(await fn(context, {})).to.be(context);
      });

      it('should return the default if provided', async () => {
        const context = 'foo';
        const args = { default: () => 'bar' };
        expect(await fn(context, args)).to.be(args.default());
      });
    });

    describe('with no matching cases', () => {
      it('should return the context if no default is provided', async () => {
        const context = 'foo';
        const args = { case: nonMatchingCases.map(getter) };
        expect(await fn(context, args)).to.be(context);
      });

      it('should return the default if provided', async () => {
        const context = 'foo';
        const args = {
          case: nonMatchingCases.map(getter),
          default: () => 'bar',
        };
        expect(await fn(context, args)).to.be(args.default());
      });
    });

    describe('with matching cases', () => {
      it('should return the first match', async () => {
        const context = 'foo';
        const args = { case: mockCases.map(getter) };
        const firstMatch = mockCases.find(c => c.matches);
        expect(await fn(context, args)).to.be(firstMatch.result);
      });
    });
  });
});
