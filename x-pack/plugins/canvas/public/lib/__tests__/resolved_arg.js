/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getState, getValue, getError } from '../resolved_arg';

describe('resolved arg helper', () => {
  describe('getState', () => {
    it('returns pending by default', () => {
      expect(getState()).to.be(null);
    });

    it('returns the state', () => {
      expect(getState({ state: 'pending' })).to.equal('pending');
      expect(getState({ state: 'ready' })).to.equal('ready');
      expect(getState({ state: 'error' })).to.equal('error');
    });
  });

  describe('getValue', () => {
    it('returns null by default', () => {
      expect(getValue()).to.be(null);
    });

    it('returns the value', () => {
      expect(getValue({ value: 'hello test' })).to.equal('hello test');
    });
  });

  describe('getError', () => {
    it('returns null by default', () => {
      expect(getError()).to.be(null);
    });

    it('returns null when state is not error', () => {
      expect(getError({ state: 'pending', error: 'nope' })).to.be(null);
    });

    it('returns the error', () => {
      const arg = {
        state: 'error',
        value: 'test',
        error: new Error('i failed'),
      };

      expect(getError(arg)).to.be.an(Error);
      expect(getError(arg).toString()).to.match(/i failed/);
    });
  });
});
