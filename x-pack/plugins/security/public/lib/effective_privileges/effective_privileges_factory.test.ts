/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { EffectivePrivileges } from './effective_privileges';
import { EffectivePrivilegesFactory } from './effective_privileges_factory';

describe('EffectivePrivilegesFactory', () => {
  it('can build itself without crashing', () => {
    const factory = new EffectivePrivilegesFactory(
      new PrivilegeDefinition({
        global: {},
        features: {},
        space: {},
      })
    );

    expect(factory.rankedFeaturePrivileges).toEqual({});
    expect(factory.rankedGlobalBasePrivileges).toEqual([]);
    expect(factory.rankedSpaceBasePrivileges).toEqual([]);
  });

  it('ranks global base privileges correctly', () => {
    const factory = new EffectivePrivilegesFactory(
      new PrivilegeDefinition({
        global: {
          a: ['foo:/bar'],
          b: ['foo:/*'],
          c: ['*'],
          d: ['foo:/bar', 'foo:/baz'],
        },
        features: {},
        space: {},
      })
    );

    expect(factory.rankedFeaturePrivileges).toEqual({});
    expect(factory.rankedGlobalBasePrivileges).toEqual(['c', 'b', 'd', 'a']);
    expect(factory.rankedSpaceBasePrivileges).toEqual([]);
  });

  it('ranks space base privileges correctly', () => {
    const factory = new EffectivePrivilegesFactory(
      new PrivilegeDefinition({
        global: {},
        features: {},
        space: {
          a: ['foo:/bar'],
          b: ['foo:/*'],
          c: ['*'],
          d: ['foo:/bar', 'foo:/baz'],
        },
      })
    );

    expect(factory.rankedFeaturePrivileges).toEqual({});
    expect(factory.rankedGlobalBasePrivileges).toEqual([]);
    expect(factory.rankedSpaceBasePrivileges).toEqual(['c', 'b', 'd', 'a']);
  });

  it('ranks feature privileges correctly', () => {
    const factory = new EffectivePrivilegesFactory(
      new PrivilegeDefinition({
        global: {},
        features: {
          feature1: {
            a: ['foo:/bar'],
            b: ['foo:/*'],
            c: ['*'],
            d: ['foo:/bar', 'foo:/baz'],
          },
          feature2: {
            a: ['foo:/*'],
            b: ['foo:/*'],
            c: ['foo:/bar', 'foo:/baz'],
            d: ['foo:/bar'],
          },
        },
        space: {},
      })
    );

    expect(factory.rankedFeaturePrivileges).toEqual({
      feature1: ['c', 'b', 'd', 'a'],
      feature2: ['a', 'b', 'c', 'd'],
    });
    expect(factory.rankedGlobalBasePrivileges).toEqual([]);
    expect(factory.rankedSpaceBasePrivileges).toEqual([]);
  });

  it('creates an EffectivePrivileges instance', () => {
    const factory = new EffectivePrivilegesFactory(
      new PrivilegeDefinition({
        global: {},
        features: {
          feature1: {
            a: ['foo:/bar'],
            b: ['foo:/*'],
            c: ['*'],
            d: ['foo:/bar', 'foo:/baz'],
          },
          feature2: {
            a: ['foo:/*'],
            b: ['foo:/*'],
            c: ['foo:/bar', 'foo:/baz'],
            d: ['foo:/bar'],
          },
        },
        space: {},
      })
    );

    const role = {
      name: 'unit test role',
      elasticsearch: {
        indices: [],
        cluster: [],
        run_as: [],
      },
      kibana: {
        global: {
          minimum: [],
          feature: {},
        },
        spaces: [],
      },
    };

    const instance = factory.getInstance(role);
    expect(instance).toBeInstanceOf(EffectivePrivileges);
  });
});
