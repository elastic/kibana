/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateCertsValues } from '../dynamic_settings';

describe('dynamic settings', () => {
  describe('validateCertValues', () => {
    it(`doesn't allow age threshold values less than 0`, () => {
      expect(
        validateCertsValues({
          certAgeThreshold: -1,
          certExpirationThreshold: 2,
          heartbeatIndices: 'foo',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "certAgeThreshold": "Value must be greater than 0.",
        }
      `);
    });

    it(`doesn't allow non-integer age threshold values`, () => {
      expect(
        validateCertsValues({
          certAgeThreshold: 10.2,
          certExpirationThreshold: 2,
          heartbeatIndices: 'foo',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "certAgeThreshold": "Value must be an integer.",
        }
      `);
    });

    it(`doesn't allow expiration threshold values less than 0`, () => {
      expect(
        validateCertsValues({
          certAgeThreshold: 2,
          certExpirationThreshold: -1,
          heartbeatIndices: 'foo',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "certExpirationThreshold": "Value must be greater than 0.",
        }
      `);
    });

    it(`doesn't allow non-integer expiration threshold values`, () => {
      expect(
        validateCertsValues({
          certAgeThreshold: 2,
          certExpirationThreshold: 1.23,
          heartbeatIndices: 'foo',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "certExpirationThreshold": "Value must be an integer.",
        }
      `);
    });

    it('allows valid values', () => {
      expect(
        validateCertsValues({
          certAgeThreshold: 2,
          certExpirationThreshold: 13,
          heartbeatIndices: 'foo',
        })
      ).toBeUndefined();
    });
  });
});
