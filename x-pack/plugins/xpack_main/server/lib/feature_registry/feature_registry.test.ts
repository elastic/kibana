/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFeatures, unregisterFeature } from '.';
import { Feature, registerFeature } from './feature_registry';

describe('registerFeature', () => {
  beforeEach(() => {
    const features = getFeatures();
    features.forEach(unregisterFeature);
  });

  it('allows a minimal feature to be registered', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
    };

    registerFeature(feature);
    const result = getFeatures();
    expect(result).toHaveLength(1);

    // Should be the equal, but not the same instance (i.e., a defensive copy)
    expect(result[0]).not.toBe(feature);
    expect(result[0]).toEqual(feature);
  });

  it('allows a complex feature to be registered', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      description: 'this is a rather boring feature description !@#$%^&*()_+-=\\[]{}|;\':"/.,<>?',
      icon: 'addDataApp',
      navLinkId: 'someNavLink',
      validLicenses: ['standard', 'basic', 'gold', 'platinum'],
    };

    registerFeature(feature);
    const result = getFeatures();
    expect(result).toHaveLength(1);

    // Should be the equal, but not the same instance (i.e., a defensive copy)
    expect(result[0]).not.toBe(feature);
    expect(result[0]).toEqual(feature);
  });

  it(`does not allow duplicate features to be registered`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
    };

    const duplicateFeature: Feature = {
      id: 'test-feature',
      name: 'Duplicate Test Feature',
    };

    registerFeature(feature);

    expect(() => registerFeature(duplicateFeature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature with id test-feature is already registered."`
    );
  });

  ['catalogue', 'management', 'navLinks', `doesn't match valid regex`].forEach(prohibitedId => {
    it(`prevents features from being registered with an ID of "${prohibitedId}"`, () => {
      expect(() =>
        registerFeature({
          id: prohibitedId,
          name: 'some feature',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
