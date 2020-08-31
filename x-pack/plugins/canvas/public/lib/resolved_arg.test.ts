/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getState, getValue, getError } from './resolved_arg';

describe('resolved arg helper', () => {
  describe('getState', () => {
    it('returns pending by default', () => {
      expect(getState()).toBe(null);
    });

    it('returns the state', () => {
      expect(getState({ state: 'pending' })).toEqual('pending');
      expect(getState({ state: 'ready' })).toEqual('ready');
      expect(getState({ state: 'error' })).toEqual('error');
    });
  });

  describe('getValue', () => {
    it('returns null by default', () => {
      expect(getValue()).toBe(null);
    });

    it('returns the value', () => {
      expect(getValue({ value: 'hello test' })).toEqual('hello test');
    });
  });

  describe('getError', () => {
    it('returns null by default', () => {
      expect(getError()).toBe(null);
    });

    it('returns null when state is not error', () => {
      expect(getError({ state: 'pending', error: 'nope' })).toBe(null);
    });

    it('returns the error', () => {
      const arg = {
        state: 'error',
        value: 'test',
        error: new Error('i failed'),
      };

      expect(getError(arg)).toMatchInlineSnapshot(`[Error: i failed]`);
    });
  });
});
