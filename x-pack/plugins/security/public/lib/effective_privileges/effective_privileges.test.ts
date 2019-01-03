/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturePrivilegeSet } from 'x-pack/plugins/security/common/model/privileges/feature_privileges';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { PRIVILEGE_SOURCE } from './effective_privileges';
import { EffectivePrivilegesFactory } from './effective_privileges_factory';

const defaultPrivilegeDefinition = new PrivilegeDefinition({
  global: {
    all: ['api:/*', 'ui:/*'],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo'],
  },
  space: {
    all: ['api:/*', 'ui:/*'],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo'],
  },
  features: {
    feature1: {
      all: ['ui:/feature1/foo', 'ui:/feature1/bar'],
      read: ['ui:/feature1/foo'],
    },
    feature2: {
      all: ['ui:/feature2/foo', 'api:/feature2/bar'],
      read: ['ui:/feature2/foo'],
    },
    feature3: {
      all: ['ui:/feature3/foo'],
    },
    feature4: {
      all: ['somethingObsecure:/foo'],
    },
  },
});

interface BuildRoleOpts {
  globalPrivilege?: {
    minimum: string[];
    feature: FeaturePrivilegeSet;
  };
  spacesPrivileges?: Array<{
    spaces: string[];
    minimum: string[];
    feature: FeaturePrivilegeSet;
  }>;
}
const buildRole = (options: BuildRoleOpts = {}) => {
  const role: Role = {
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

  if (options.globalPrivilege) {
    role.kibana.spaces.push({
      spaces: ['*'],
      ...options.globalPrivilege,
    });
  }

  if (options.spacesPrivileges) {
    role.kibana.spaces.push(...options.spacesPrivileges);
  }

  return role;
};

const buildEffectivePrivileges = (
  role: Role,
  privilegeDefinition: PrivilegeDefinition = defaultPrivilegeDefinition
) => {
  const factory = new EffectivePrivilegesFactory(privilegeDefinition);
  return factory.getInstance(role);
};

describe('EffectivePrivileges', () => {
  // implementation detail: `get*Privileges` uses `explain*Privileges`,
  // so these tests will assert that the results of the two functions are the same. The alternatives are to duplicate all of these tests,
  // or to create enough abstractions to make the bulk if this re-usable, which isn't very easy to understand.

  describe('#explainActualSpaceBasePrivilege', () => {
    it(`returns 'none' when no privileges are assigned`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceBasePrivilege(0)).toMatchObject({
        privilege: NO_PRIVILEGE_VALUE,
        source: PRIVILEGE_SOURCE.NONE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceBasePrivilege(0)).toEqual(NO_PRIVILEGE_VALUE);
    });
  });

  describe('#explainActualSpaceFeaturePrivilege', () => {
    it(`returns 'none' when no privileges are assigned`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 0)).toMatchObject({
        privilege: NO_PRIVILEGE_VALUE,
        source: PRIVILEGE_SOURCE.NONE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 0)).toEqual(
        NO_PRIVILEGE_VALUE
      );
    });

    it(`returns 'read' when assigned directly`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 0)).toMatchObject({
        privilege: 'read',
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 0)).toEqual('read');
    });

    it(`returns 'read' when assigned effectively via space base privilege`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: ['read'],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 0)).toMatchObject({
        privilege: 'read',
        source: PRIVILEGE_SOURCE.EFFECTIVE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 0)).toEqual('read');
    });

    it(`returns 'read' when assigned effectively via global base privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: ['read'],
          feature: {},
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'read',
        source: PRIVILEGE_SOURCE.EFFECTIVE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('read');
    });

    it(`returns 'read' when assigned effectively via global feature privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: [],
          feature: {
            feature1: ['read'],
          },
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'read',
        source: PRIVILEGE_SOURCE.EFFECTIVE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('read');
    });

    it(`returns 'all' when assigned effectively via global base privilege overriding global feature privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: ['all'],
          feature: {
            feature1: ['read'],
          },
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'all',
        source: PRIVILEGE_SOURCE.EFFECTIVE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('all');
    });

    it(`returns 'all' when assigned effectively via global feature privilege overriding global base privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: ['read'],
          feature: {
            feature1: ['all'],
          },
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {},
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'all',
        source: PRIVILEGE_SOURCE.EFFECTIVE,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('all');
    });

    it(`returns 'all' when assigned effectively via global base privilege overriding directly assigned feature privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: ['all'],
          feature: {},
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'all',
        source: PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('all');
    });

    it(`returns 'all' when assigned effectively via global feature privilege overriding directly assigned feature privilege`, () => {
      const role = buildRole({
        globalPrivilege: {
          minimum: ['read'],
          feature: {
            feature1: ['all'],
          },
        },
        spacesPrivileges: [
          {
            spaces: ['marketing'],
            minimum: [],
            feature: {
              feature1: ['read'],
            },
          },
        ],
      });

      const effectivePrivileges = buildEffectivePrivileges(role);
      expect(effectivePrivileges.explainActualSpaceFeaturePrivilege('feature1', 1)).toMatchObject({
        privilege: 'all',
        source: PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED,
        details: expect.any(String),
      });
      expect(effectivePrivileges.getActualSpaceFeaturePrivilege('feature1', 1)).toEqual('all');
    });
  });
});
