/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasCapabilities } from './has_capabilities';

const EMPTY_CAPABILITIES = { navLinks: {}, management: {}, catalogue: {} };
const SAMPLE_CAPABILITY = { show: true, crud: true };

describe('hasCapabilities', () => {
  it('returns true when no capabilities are required', () => {
    expect(hasCapabilities(EMPTY_CAPABILITIES)).toEqual(true);
  });

  describe('when requiredCapabilities is a string', () => {
    it('returns false when the capability is not present', () => {
      expect(hasCapabilities(EMPTY_CAPABILITIES, 'missingCapability')).toEqual(false);
    });

    it('returns true when the capability is present', () => {
      const capabilities = {
        ...EMPTY_CAPABILITIES,
        requiredCapability: SAMPLE_CAPABILITY,
      };
      expect(hasCapabilities(capabilities, 'requiredCapability')).toEqual(true);
    });
  });

  describe('when requiredCapabilities is an array', () => {
    describe('when there is only one array (OR)', () => {
      it('returns false when none of the capabilities are present', () => {
        expect(
          hasCapabilities(EMPTY_CAPABILITIES, ['missingCapability1', 'missingCapability2'])
        ).toEqual(false);
      });

      it('returns true when any of the capabilities are present', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: SAMPLE_CAPABILITY,
        };
        expect(hasCapabilities(capabilities, ['requiredCapability', 'missingCapability'])).toEqual(
          true
        );
      });
    });

    describe('when there subArrays (And)', () => {
      it('returns false when one of the capabilities is not present', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability1: SAMPLE_CAPABILITY,
        };

        expect(
          hasCapabilities(capabilities, [['requiredCapability1', 'requiredCapability2']])
        ).toEqual(false);
      });

      it('returns true when both capabilities are present', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability1: SAMPLE_CAPABILITY,
          requiredCapability2: SAMPLE_CAPABILITY,
        };
        expect(
          hasCapabilities(capabilities, [['requiredCapability1', 'requiredCapability2']])
        ).toEqual(true);
      });
    });
  });
});
