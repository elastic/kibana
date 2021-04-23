/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { functionWrapper } from '../../../test_helpers/function_wrapper';
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
      it('should return a case object that matches with the result as the context', () => {
        const context = null;
        const args = {};
        expect(fn(context, args)).resolves.toEqual({
          type: 'case',
          matches: true,
          result: context,
        });
      });
    });

    describe('no if or value', () => {
      it('should return the result if provided', () => {
        const context = null;
        const args = {
          then: () => of('foo'),
        };
        expect(fn(context, args)).resolves.toEqual({
          type: 'case',
          matches: true,
          result: 'foo',
        });
      });
    });

    describe('with if', () => {
      it('should return as the matches prop', () => {
        const context = null;
        const args = { if: false };
        expect(fn(context, args)).resolves.toEqual({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });

    describe('with value', () => {
      it('should return whether it matches the context as the matches prop', () => {
        const args = {
          when: () => of('foo'),
          then: () => of('bar'),
        };
        expect(fn('foo', args)).resolves.toEqual({
          type: 'case',
          matches: true,
          result: 'bar',
        });
        expect(fn('bar', args)).resolves.toEqual({
          type: 'case',
          matches: false,
          result: null,
        });
      });
    });

    describe('with if and value', () => {
      it('should return the if as the matches prop', () => {
        const context = null;
        const args = {
          when: () => 'foo',
          if: true,
        };
        expect(fn(context, args)).resolves.toEqual({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });
  });
});
