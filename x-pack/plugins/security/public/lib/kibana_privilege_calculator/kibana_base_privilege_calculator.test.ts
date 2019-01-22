/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeaturePrivilegeSet,
  KibanaPrivilegeSpec,
  PrivilegeDefinition,
  Role,
} from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { KibanaBasePrivilegeCalculator } from './kibana_base_privilege_calculator';
import { PRIVILEGE_SOURCE, PrivilegeExplanation } from './kibana_privilege_calculator_types';

const defaultPrivilegeDefinition = new PrivilegeDefinition({
  global: {
    all: ['api:/*', 'ui:/*'],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo', 'ui:/feature3/foo/*'],
  },
  space: {
    all: [
      'api:/feature1/*',
      'ui:/feature1/*',
      'api:/feature2/*',
      'ui:/feature2/*',
      'ui:/feature3/foo',
      'ui:/feature3/foo/*',
    ],
    read: ['ui:/feature1/foo', 'ui:/feature2/foo', 'ui:/feature3/foo/bar'],
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
      all: ['ui:/feature3/foo', 'ui:/feature3/foo/*'],
    },
  },
});

interface BuildRoleOpts {
  spacesPrivileges?: Array<{
    spaces: string[];
    base: string[];
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
    kibana: [],
  };

  if (options.spacesPrivileges) {
    role.kibana.push(...options.spacesPrivileges);
  } else {
    role.kibana.push({
      spaces: ['*'],
      base: [],
      feature: {},
    });
  }

  return role;
};

const buildEffectiveBasePrivilegeCalculator = (
  role: Role,
  privilegeDefinition: PrivilegeDefinition = defaultPrivilegeDefinition
) => {
  const globalPrivilegeSpec =
    role.kibana.find(k => isGlobalPrivilegeDefinition(k)) ||
    ({
      spaces: ['*'],
      base: [],
      feature: {},
    } as KibanaPrivilegeSpec);

  return new KibanaBasePrivilegeCalculator(privilegeDefinition, globalPrivilegeSpec);
};

describe('getMostPermissiveBasePrivilege', () => {
  describe('without ignoring assigned', () => {
    it('returns "none" when no privileges are granted', () => {
      const role = buildRole();
      const effecetiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effecetiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[0],
        false
      );

      expect(result).toEqual({
        actualPrivilege: NO_PRIVILEGE_VALUE,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: true,
      } as PrivilegeExplanation);
    });

    defaultPrivilegeDefinition
      .getGlobalPrivileges()
      .getAllPrivileges()
      .forEach(globalBasePrivilege => {
        it(`returns "${globalBasePrivilege}" when assigned directly at the global privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['*'],
                base: [globalBasePrivilege],
                feature: {},
              },
            ],
          });
          const effecetiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effecetiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            false
          );

          expect(result).toEqual({
            actualPrivilege: globalBasePrivilege,
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    defaultPrivilegeDefinition
      .getSpacesPrivileges()
      .getAllPrivileges()
      .forEach(spaceBasePrivilege => {
        it(`returns "${spaceBasePrivilege}" when assigned directly at the space base privilege`, () => {
          const role = buildRole({
            spacesPrivileges: [
              {
                spaces: ['foo'],
                base: [spaceBasePrivilege],
                feature: {},
              },
            ],
          });
          const effecetiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
          const result: PrivilegeExplanation = effecetiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
            role.kibana[0],
            false
          );

          expect(result).toEqual({
            actualPrivilege: spaceBasePrivilege,
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: true,
          } as PrivilegeExplanation);
        });
      });

    it('returns the global privilege when no space base is defined', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ],
      });
      const effecetiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effecetiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        false
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
      } as PrivilegeExplanation);
    });

    it('returns the global privilege when it supercedes the space privilege', () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['read'],
            feature: {},
          },
        ],
      });
      const effecetiveBasePrivilegesCalculator = buildEffectiveBasePrivilegeCalculator(role);
      const result: PrivilegeExplanation = effecetiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        role.kibana[1],
        false
      );

      expect(result).toEqual({
        actualPrivilege: 'all',
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
        supercededPrivilege: 'read',
        supercededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
      } as PrivilegeExplanation);
    });
  });
});
