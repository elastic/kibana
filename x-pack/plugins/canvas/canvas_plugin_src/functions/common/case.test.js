/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { caseFn } from './case';

describe('case', () => {
  const fn = functionWrapper(caseFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(typeof fn).toBe('function');
    });
  });

  describe('function', () => {
    describe('no args', () => {
      it('should return a case object that matches with the result as the context', async () => {
        const context = null;
        const args = {};
        expect(await fn(context, args)).toEqual({
          type: 'case',
          matches: true,
          result: context,
        });
      });
    });

    describe('no if or value', () => {
      it('should return the result if provided', async () => {
        const context = null;
        const args = {
          then: () => 'foo',
        };
        expect(await fn(context, args)).toEqual({
          type: 'case',
          matches: true,
          result: args.then(),
        });
      });
    });

    describe('with if', () => {
      it('should return as the matches prop', async () => {
        const context = null;
        const args = { if: false };
        expect(await fn(context, args)).toEqual({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });

    describe('with value', () => {
      it('should return whether it matches the context as the matches prop', async () => {
        const args = {
          when: () => 'foo',
          then: () => 'bar',
        };
        expect(await fn('foo', args)).toEqual({
          type: 'case',
          matches: true,
          result: args.then(),
        });
        expect(await fn('bar', args)).toEqual({
          type: 'case',
          matches: false,
          result: null,
        });
      });
    });

    describe('with if and value', () => {
      it('should return the if as the matches prop', async () => {
        const context = null;
        const args = {
          when: () => 'foo',
          if: true,
        };
        expect(await fn(context, args)).toEqual({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });
  });
});
