/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isSeedNodeValid,
  isSeedNodePortValid,
} from './validate_seed_node';

describe('Validate seed node', () => {
  describe('isSeedNodeValid', () => {
    describe('rejects', () => {
      it('adjacent periods', () => {
        expect(isSeedNodeValid('a..b')).toBe(false);
      });

      it('underscores', () => {
        expect(isSeedNodeValid('____')).toBe(false);
      });

      ['/', '\\', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '=', '+', '?'].forEach(char => {
        it(char, () => {
          expect(isSeedNodeValid(char)).toBe(false);
        });
      });
    });

    describe('accepts', () => {
      it('uppercase letters', () => {
        expect(isSeedNodeValid('A.B.C.D')).toBe(true);
      });

      it('lowercase letters', () => {
        expect(isSeedNodeValid('a')).toBe(true);
      });

      it('numbers', () => {
        expect(isSeedNodeValid('56546354')).toBe(true);
      });

      it('dashes', () => {
        expect(isSeedNodeValid('----')).toBe(true);
      });

      it('many parts', () => {
        expect(isSeedNodeValid('abcd.efgh.ijkl.mnop.qrst.uvwx.yz')).toBe(true);
      });
    });
  });

  describe('isSeedNodePortValid', () => {
    describe('rejects', () => {
      it('missing port', () => {
        expect(isSeedNodePortValid('abcd')).toBe(false);
      });

      it('empty port', () => {
        expect(isSeedNodePortValid('abcd:')).toBe(false);
      });

      it('letters', () => {
        expect(isSeedNodePortValid('ab:cd')).toBe(false);
      });

      it('non-numbers', () => {
        expect(isSeedNodePortValid('ab:5 0')).toBe(false);
      });

      it('multiple ports', () => {
        expect(isSeedNodePortValid('ab:cd:9000')).toBe(false);
      });
    });

    describe('accepts', () => {
      it('a single numeric port, even beyond the standard port range', () => {
        expect(isSeedNodePortValid('abcd:100000000')).toBe(true);
      });
    });
  });
});
