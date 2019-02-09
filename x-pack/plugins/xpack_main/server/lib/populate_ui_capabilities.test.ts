/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
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
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
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

    expect(populateUICapabilities(xpackMainPlugin, {} as UICapabilities)).toEqual({});
  });

  it('returns the original uiCapabilities untouched when no features are registered', () => {
    const xpackMainPlugin = getMockXpackMainPlugin([]);
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
      },
      otherFeature: {},
    });
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
      },
      newFeature: {},
      otherFeature: {},
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
      },
      newFeature: {
        capability1: true,
        capability2: true,
      },
      otherFeature: {},
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        anotherFooEntry: true,
        barEntry: true,
        anotherBarEntry: true,
      },
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      otherFeature: {},
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
      },
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
      otherFeature: {},
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
    const originalInjectedVars = getMockOriginalInjectedVars();

    expect(populateUICapabilities(xpackMainPlugin, originalInjectedVars.uiCapabilities)).toEqual({
      anotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      feature: {
        someCapability: true,
      },
      navLinks: {
        foo: true,
        bar: true,
      },
      management: {},
      catalogue: {
        fooEntry: true,
        barEntry: true,
      },
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
      otherFeature: {},
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
