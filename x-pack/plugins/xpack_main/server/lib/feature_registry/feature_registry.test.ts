/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureRegistry } from './feature_registry';

describe('FeatureRegistry', () => {
  it('allows a minimal feature to be registered', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      privileges: {},
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();
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
          metadata: {
            tooltip: 'some fancy tooltip',
          },
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

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();
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

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);

    expect(() => featureRegistry.register(duplicateFeature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature with id test-feature is already registered."`
    );
  });

  ['catalogue', 'management', 'navLinks', `doesn't match valid regex`].forEach(prohibitedId => {
    it(`prevents features from being registered with an ID of "${prohibitedId}"`, () => {
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.register({
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
          metadata: {
            tooltip: 'some fancy tooltip',
          },
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

    const featureRegistry = new FeatureRegistry();
    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"child \\"privileges\\" fails because [\\"some invalid key\\" is not allowed]"`
    );
  });

  it('cannot register feature after getAll has been called', () => {
    const feature1: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      privileges: {},
    };
    const feature2: Feature = {
      id: 'test-feature-2',
      name: 'Test Feature 2',
      privileges: {},
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature1);
    featureRegistry.getAll();
    expect(() => {
      featureRegistry.register(feature2);
    }).toThrowErrorMatchingInlineSnapshot(`"Features are locked, can't register new features"`);
  });
});
