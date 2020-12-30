/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAddressValid, isPortValid } from './validate_address';

describe('Validate address', () => {
  describe('isSeedNodeValid', () => {
    describe('rejects', () => {
      it('adjacent periods', () => {
        expect(isAddressValid('a..b')).toBe(false);
      });

      it('underscores', () => {
        expect(isAddressValid('____')).toBe(false);
      });

      ['/', '\\', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '=', '+', '?'].forEach(
        (char) => {
          it(char, () => {
            expect(isAddressValid(char)).toBe(false);
          });
        }
      );
    });

    describe('accepts', () => {
      it('uppercase letters', () => {
        expect(isAddressValid('A.B.C.D')).toBe(true);
      });

      it('lowercase letters', () => {
        expect(isAddressValid('a')).toBe(true);
      });

      it('numbers', () => {
        expect(isAddressValid('56546354')).toBe(true);
      });

      it('dashes', () => {
        expect(isAddressValid('----')).toBe(true);
      });

      it('many parts', () => {
        expect(isAddressValid('abcd.efgh.ijkl.mnop.qrst.uvwx.yz')).toBe(true);
      });
    });
  });

  describe('isPortValid', () => {
    describe('rejects', () => {
      it('missing port', () => {
        expect(isPortValid('abcd')).toBe(false);
      });

      it('empty port', () => {
        expect(isPortValid('abcd:')).toBe(false);
      });

      it('letters', () => {
        expect(isPortValid('ab:cd')).toBe(false);
      });

      it('non-numbers', () => {
        expect(isPortValid('ab:5 0')).toBe(false);
      });

      it('multiple ports', () => {
        expect(isPortValid('ab:cd:9000')).toBe(false);
      });
    });

    describe('accepts', () => {
      it('a single numeric port, even beyond the standard port range', () => {
        expect(isPortValid('abcd:100000000')).toBe(true);
      });
    });
  });
});
