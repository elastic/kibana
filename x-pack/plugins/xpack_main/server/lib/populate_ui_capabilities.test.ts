/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from './feature_registry';
import { populateUICapabilities } from './populate_ui_capabilities';

function getMockXpackMainPlugin(features: Feature[]) {
  return {
    getFeatures: () => features,
  };
}

function getMockOriginalInjectedVars() {
  return {
    uiCapabilities: {
      navLinks: {
        foo: true,
        bar: true,
      },
      feature: {
        someCapability: true,
      },
      otherFeature: {},
    },
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
    const originalInjectedVars = {};

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it('returns the original uiCapabilities untouched when no features are registered', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it('handles features with no registered capabilities', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        privileges: {
          ...createFeaturePrivilege('all'),
        },
      },
    ]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it('handles features with only a navlink specified', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        privileges: {
          ...createFeaturePrivilege('all'),
        },
      },
    ]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it('augments the original uiCapabilities with registered feature capabilities', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        privileges: {
          ...createFeaturePrivilege('all', ['capability1', 'capability2']),
        },
      },
    ]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it(`merges capabilities from all feature privileges`, () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
          ...createFeaturePrivilege('baz', ['capability1', 'capability5']),
        },
      },
    ]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });

  it('supports merging multiple features with multiple privileges each', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([
      {
        id: 'newFeature',
        name: 'my new feature',
        navLinkId: 'newFeatureNavLink',
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
          ...createFeaturePrivilege('baz', ['capability1', 'capability5']),
        },
      },
      {
        id: 'anotherNewFeature',
        name: 'another new feature',
        privileges: {
          ...createFeaturePrivilege('foo', ['capability1', 'capability2']),
          ...createFeaturePrivilege('bar', ['capability3', 'capability4']),
        },
      },
      {
        id: 'yetAnotherNewFeature',
        name: 'yet another new feature',
        navLinkId: 'yetAnotherNavLink',
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars)).toMatchSnapshot();
  });
});
