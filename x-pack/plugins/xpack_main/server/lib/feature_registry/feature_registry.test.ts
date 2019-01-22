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
      privileges: {},
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
      privileges: {
        all: {
          app: ['app1', 'app2'],
          savedObject: {
            all: ['config', 'space', 'etc'],
            read: ['canvas'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
      },
      privilegesTooltip: 'some fancy tooltip',
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
      privileges: {},
    };

    const duplicateFeature: Feature = {
      id: 'test-feature',
      name: 'Duplicate Test Feature',
      privileges: {},
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
          privileges: {},
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  it('prevents features from being registered with invalid privileges', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      privileges: {
        ['some invalid key']: {
          app: ['app1', 'app2'],
          savedObject: {
            all: ['config', 'space', 'etc'],
            read: ['canvas'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
      },
    };

    expect(() => registerFeature(feature)).toThrowErrorMatchingInlineSnapshot(
      `"child \\"privileges\\" fails because [\\"some invalid key\\" is not allowed]"`
    );
  });
});
