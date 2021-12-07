/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTLSSettings, isTLSFormValid } from './tls_settings';

describe('tls_settings', () => {
  describe('isTLSFormValid', () => {
    describe('validates duration fields', () => {
      ['tls_certificate', 'tls_key'].map((key) => {
        it(`return false when  ${key} lower then 1ms`, () => {
          const settings = getTLSSettings();
          expect(
            isTLSFormValid(
              { tls_enabled: { value: true, type: 'bool' } },
              settings
            )
          ).toBeFalsy();
        });
      });
    });

    it('returns true when tls_enabled is disabled', () => {
      const settings = getTLSSettings();
      expect(
        isTLSFormValid(
          { tls_enabled: { value: false, type: 'bool' } },
          settings
        )
      ).toBeTruthy();
    });
  });
});
