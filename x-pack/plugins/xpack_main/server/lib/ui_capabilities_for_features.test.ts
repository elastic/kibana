/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from './feature_registry';
import { uiCapabilitiesForFeatures } from './ui_capabilities_for_features';

function getMockXpackMainPlugin(features: Feature[]) {
  return {
    getFeatures: () => features,
  };
}

function createFeaturePrivilege(key: string, capabilities: string[] = []) {
  return {
    [key]: {
      savedObject: {
        all: [],
        read: [],
      },
      app: [],
      ui: [...capabilities],
    },
  };
}

describe('populateUICapabilities', () => {
  it('handles no original uiCapabilites and no registered features gracefully', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({});
  });

  it('handles features with no registered capabilities', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('all'),
        },
      },
    ]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({
      catalogue: {},
      newFeature: {},
    });
  });

  it('augments the original uiCapabilities with registered feature capabilities', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('all', ['capability1', 'capability2']),
        },
      },
    ]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({
      catalogue: {},
      newFeature: {
        capability1: true,
        capability2: true,
      },
    });
  });

  it('combines catalogue entries from multiple features', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        app: ['bar-app'],
        catalogue: ['anotherFooEntry', 'anotherBarEntry'],
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
          ...createFeaturePrivilege('baz'),
        },
      },
    ]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({
      catalogue: {
        anotherFooEntry: true,
        anotherBarEntry: true,
      },
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
    });
  });

  it(`merges capabilities from all feature privileges`, () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
          ...createFeaturePrivilege('baz', ['capability1', 'capability5']),
        },
      },
    ]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({
      catalogue: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
    });
  });

  it('supports merging multiple features with multiple privileges each', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
          ...createFeaturePrivilege('baz', ['capability1', 'capability5']),
        },
      },
      {
        id: 'anotherNewFeature',
        name: 'another new feature',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
        },
      },
      {
        id: 'yetAnotherNewFeature',
        name: 'yet another new feature',
        navLinkId: 'yetAnotherNavLink',
        app: ['bar-app'],
        privileges: {
          ...createFeaturePrivilege('all', ['capability1', 'capability2']),
          ...createFeaturePrivilege('read', []),
          ...createFeaturePrivilege('somethingInBetween', [
            'something1',
            'something2',
            'something3',
          ]),
        },
      },
    ]);

    expect(uiCapabilitiesForFeatures(xpackMainPlugin)).toEqual({
      anotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      catalogue: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
      yetAnotherNewFeature: {
        capability1: true,
        capability2: true,
        something1: true,
        something2: true,
        something3: true,
      },
    });
  });
});
