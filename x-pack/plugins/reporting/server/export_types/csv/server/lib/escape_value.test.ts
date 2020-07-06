/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { createEscapeValue } from './escape_value';

describe('escapeValue', function () {
  describe('quoteValues is true', function () {
    let escapeValue: (val: string) => string;
    beforeEach(function () {
      escapeValue = createEscapeValue(true, false);
    });

    it('should escape value with spaces', function () {
      expect(escapeValue('baz qux')).to.be('"baz qux"');
    });

    it('should escape values with hyphens', function () {
      expect(escapeValue('baz-qux')).to.be('"baz-qux"');
    });

    it('should not escape small integers', function () {
      expect(escapeValue((1).toString())).to.be('1');
    });

    it('should not escape small whole numbers', function () {
      expect(escapeValue((1.0).toString())).to.be('1');
    });

    it('should escape decimal numbers', function () {
      expect(escapeValue((1.1).toString())).to.be('"1.1"');
    });

    it('should not comma-separate large integers', function () {
      expect(escapeValue((1000000).toString())).to.be('1000000');
    });

    it('should treat booleans like strings', function () {
      expect(escapeValue(true.toString())).to.be('true');
    });
  });

  describe('quoteValues is false', function () {
    let escapeValue: (val: string) => string;
    beforeEach(function () {
      escapeValue = createEscapeValue(false, false);
    });

    it('should return the value unescaped', function () {
      const value = '"foo, bar & baz-qux"';
      expect(escapeValue(value)).to.be(value);
    });
  });

  describe('escapeValues', () => {
    describe('when true', () => {
      let escapeValue: (val: string) => string;
      beforeEach(function () {
        escapeValue = createEscapeValue(true, true);
      });

      ['@', '+', '-', '='].forEach((badChar) => {
        it(`should escape ${badChar} injection values`, function () {
          expect(escapeValue(`${badChar}cmd|' /C calc'!A0`)).to.be(
            `"'${badChar}cmd|' /C calc'!A0"`
          );
        });
      });
    });

    describe('when false', () => {
      let escapeValue: (val: string) => string;
      beforeEach(function () {
        escapeValue = createEscapeValue(true, false);
      });

      ['@', '+', '-', '='].forEach((badChar) => {
        it(`should not escape ${badChar} injection values`, function () {
          expect(escapeValue(`${badChar}cmd|' /C calc'!A0`)).to.be(`"${badChar}cmd|' /C calc'!A0"`);
        });
      });
    });
  });
});
