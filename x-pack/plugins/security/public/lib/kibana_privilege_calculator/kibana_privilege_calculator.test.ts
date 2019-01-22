/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturePrivilegeSet, PrivilegeDefinition, Role } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { PRIVILEGE_SOURCE, PrivilegeExplanation } from './kibana_privilege_calculator_types';
import { KibanaPrivilegeCalculatorFactory } from './kibana_privileges_calculator_factory';

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
  }

  return role;
};

const buildEffectivePrivileges = (
  role: Role,
  privilegeDefinition: PrivilegeDefinition = defaultPrivilegeDefinition
) => {
  const factory = new KibanaPrivilegeCalculatorFactory(privilegeDefinition);
  return factory.getInstance(role);
};

const buildExpectedFeaturePrivileges = (
  expectedFeaturePrivileges: PrivilegeExplanation | { [featureId: string]: PrivilegeExplanation }
) => {
  if (expectedFeaturePrivileges.hasOwnProperty('actualPrivilege')) {
    return {
      feature: {
        feature1: expectedFeaturePrivileges,
        feature2: expectedFeaturePrivileges,
        feature3: expectedFeaturePrivileges,
      },
    };
  }

  return {
    feature: {
      ...expectedFeaturePrivileges,
    },
  };
};

describe('calculateEffectivePrivileges', () => {
  it(`returns an empty array for an empty role`, () => {
    const role = buildRole();
    const effectivePrivileges = buildEffectivePrivileges(role);
    const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();
    expect(calculatedPrivileges).toHaveLength(0);
  });

  it(`calculates "none" for all privileges when nothing is assigned`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['foo', 'bar'],
          base: [],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivileges(role);
    const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();
    expect(calculatedPrivileges).toEqual([
      {
        base: {
          actualPrivilege: NO_PRIVILEGE_VALUE,
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          isDirectlyAssigned: true,
        },
        ...buildExpectedFeaturePrivileges({
          actualPrivilege: NO_PRIVILEGE_VALUE,
          actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
          isDirectlyAssigned: true,
        }),
      },
    ]);
  });

  describe(`with global base privilege of "all"`, () => {
    it(`calculates global feature privileges === all`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
          }),
        },
      ]);
    });

    it(`calculates space base and feature privileges === all`, () => {
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
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      const calculatedSpacePrivileges = calculatedPrivileges[1];

      expect(calculatedSpacePrivileges).toEqual({
        base: {
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        },
        ...buildExpectedFeaturePrivileges({
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        }),
      });
    });

    describe(`and with feature privileges assigned`, () => {
      it('returns the base privileges when they are more permissive', () => {
        const role = buildRole({
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {
                feature1: ['read'],
                feature2: ['read'],
                feature3: ['read'],
              },
            },
            {
              spaces: ['foo'],
              base: [],
              feature: {
                feature1: ['read'],
                feature2: ['read'],
                feature3: ['read'],
              },
            },
          ],
        });
        const effectivePrivileges = buildEffectivePrivileges(role);
        const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

        expect(calculatedPrivileges).toEqual([
          {
            base: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: true,
            },
            ...buildExpectedFeaturePrivileges({
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
              supercededPrivilege: 'read',
              supercededPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
            }),
          },
          {
            base: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            ...buildExpectedFeaturePrivileges({
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
              supercededPrivilege: 'read',
              supercededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
            }),
          },
        ]);
      });
    });
  });

  describe(`with global base privilege of "read"`, () => {
    it(`it calculates space base and feature privileges when none are provided`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            feature1: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature2: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature3: {
              actualPrivilege: NO_PRIVILEGE_VALUE,
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
              isDirectlyAssigned: true,
            },
          }),
        },
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
          },
          ...buildExpectedFeaturePrivileges({
            feature1: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature2: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature3: {
              actualPrivilege: NO_PRIVILEGE_VALUE,
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            },
          }),
        },
      ]);
    });

    describe('and with feature privileges assigned', () => {
      it('returns the feature privileges when they are more permissive', () => {
        const role = buildRole({
          spacesPrivileges: [
            {
              spaces: ['*'],
              base: ['read'],
              feature: {
                feature1: ['all'],
                feature2: ['all'],
                feature3: ['all'],
              },
            },
            {
              spaces: ['foo'],
              base: [],
              feature: {
                feature1: ['all'],
                feature2: ['all'],
                feature3: ['all'],
              },
            },
          ],
        });
        const effectivePrivileges = buildEffectivePrivileges(role);
        const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

        expect(calculatedPrivileges).toEqual([
          {
            base: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: true,
            },
            ...buildExpectedFeaturePrivileges({
              feature1: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
              feature2: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
              feature3: {
                actualPrivilege: 'all',
                actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
                isDirectlyAssigned: true,
              },
            }),
          },
          {
            base: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            ...buildExpectedFeaturePrivileges({
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            }),
          },
        ]);
      });
    });
  });

  describe('with both global and space base privileges assigned', () => {
    it(`does not override space base of "all" when global base is "read"`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['all'],
            feature: {},
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            feature1: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature2: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature3: {
              actualPrivilege: NO_PRIVILEGE_VALUE,
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
              isDirectlyAssigned: true,
            },
          }),
        },
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
            isDirectlyAssigned: false,
          }),
        },
      ]);
    });

    it(`calcualtes "all" for space base and space features when superceded by global "all"`, () => {
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
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
          }),
        },
        {
          base: {
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
            supercededPrivilege: 'read',
            supercededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          },
          ...buildExpectedFeaturePrivileges({
            actualPrivilege: 'all',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
          }),
        },
      ]);
    });

    it(`does not override feature privileges when they are more permissive`, () => {
      const role = buildRole({
        spacesPrivileges: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['read'],
            feature: {
              feature1: ['all'],
              feature2: ['all'],
              feature3: ['all'],
            },
          },
        ],
      });
      const effectivePrivileges = buildEffectivePrivileges(role);
      const calculatedPrivileges = effectivePrivileges.calculateEffectivePrivileges();

      expect(calculatedPrivileges).toEqual([
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: true,
          },
          ...buildExpectedFeaturePrivileges({
            feature1: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature2: {
              actualPrivilege: 'read',
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
              isDirectlyAssigned: false,
            },
            feature3: {
              actualPrivilege: NO_PRIVILEGE_VALUE,
              actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
              isDirectlyAssigned: true,
            },
          }),
        },
        {
          base: {
            actualPrivilege: 'read',
            actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
            isDirectlyAssigned: false,
            supercededPrivilege: 'read',
            supercededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          },
          ...buildExpectedFeaturePrivileges({
            feature1: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            },
            feature2: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            },
            feature3: {
              actualPrivilege: 'all',
              actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
              isDirectlyAssigned: true,
            },
          }),
        },
      ]);
    });
  });
});
