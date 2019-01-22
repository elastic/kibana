/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FeaturePrivilegeSet, PrivilegeDefinition, Role } from '../../../common/model';
import { KibanaAllowedPrivilegesCalculator } from './kibana_allowed_privileges_calculator';
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

const buildAllowedPrivilegesCalculator = (
  role: Role,
  privilegeDefinition: PrivilegeDefinition = defaultPrivilegeDefinition
) => {
  return new KibanaAllowedPrivilegesCalculator(privilegeDefinition, role);
};

const buildEffectivePrivilegesCalculator = (
  role: Role,
  privilegeDefinition: PrivilegeDefinition = defaultPrivilegeDefinition
) => {
  const factory = new KibanaPrivilegeCalculatorFactory(privilegeDefinition);
  return factory.getInstance(role);
};

const unrestrictedBasePrivileges = {
  base: {
    privileges: ['all', 'read'],
    canUnassign: true,
  },
};
const unrestrictedFeaturePrivileges = {
  feature: {
    feature1: {
      privileges: ['all', 'read'],
      canUnassign: true,
    },
    feature2: {
      privileges: ['all', 'read'],
      canUnassign: true,
    },
    feature3: {
      privileges: ['all'],
      canUnassign: true,
    },
  },
};

const fullyRestrictedBasePrivileges = {
  base: {
    privileges: ['all'],
    canUnassign: false,
  },
};

const fullyRestrictedFeaturePrivileges = {
  feature: {
    feature1: {
      privileges: ['all'],
      canUnassign: false,
    },
    feature2: {
      privileges: ['all'],
      canUnassign: false,
    },
    feature3: {
      privileges: ['all'],
      canUnassign: false,
    },
  },
};

describe('AllowedPrivileges', () => {
  it('allows all privileges when none are currently assigned', () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {},
        },
        {
          spaces: ['foo'],
          base: [],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
    ]);
  });

  it('allows all global base privileges, but just "all" for everything else when global is set to "all"', () => {
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
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...fullyRestrictedFeaturePrivileges,
      },
      {
        ...fullyRestrictedBasePrivileges,
        ...fullyRestrictedFeaturePrivileges,
      },
    ]);
  });

  it(`allows feature privileges to be set to "all" or "read" when global base is "read"`, () => {
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
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    const expectedFeaturePrivileges = {
      feature: {
        feature1: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        feature2: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        feature3: {
          privileges: ['all'],
          canUnassign: true, // feature 3 has no "read" privilege governed by global "all"
        },
      },
    };

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...expectedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: false,
        },
        ...expectedFeaturePrivileges,
      },
    ]);
  });

  it(`allows feature privileges to be set to "all" or "read" when space base is "read"`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {},
        },
        {
          spaces: ['foo'],
          base: ['read'],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: true,
        },
        feature: {
          feature1: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: true, // feature 3 has no "read" privilege governed by space "all"
          },
        },
      },
    ]);
  });

  it(`allows space base privilege to be set to "all" or "read" when space base is already "all"`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['foo'],
          base: ['all'],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        feature: {
          feature1: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: false,
          },
        },
      },
    ]);
  });

  it(`restricts space feature privileges when global feature privileges are set`, () => {
    const role = buildRole({
      spacesPrivileges: [
        {
          spaces: ['*'],
          base: [],
          feature: {
            feature1: ['all'],
            feature2: ['read'],
          },
        },
        {
          spaces: ['foo'],
          base: [],
          feature: {},
        },
      ],
    });
    const effectivePrivileges = buildEffectivePrivilegesCalculator(role);
    const allowedPrivilegesCalculator = buildAllowedPrivilegesCalculator(role);

    const result = allowedPrivilegesCalculator.calculateAllowedPrivileges(
      effectivePrivileges.calculateEffectivePrivileges(true)
    );

    expect(result).toEqual([
      {
        ...unrestrictedBasePrivileges,
        ...unrestrictedFeaturePrivileges,
      },
      {
        base: {
          privileges: ['all', 'read'],
          canUnassign: true,
        },
        feature: {
          feature1: {
            privileges: ['all'],
            canUnassign: false,
          },
          feature2: {
            privileges: ['all', 'read'],
            canUnassign: false,
          },
          feature3: {
            privileges: ['all'],
            canUnassign: true, // feature 3 has no "read" privilege governed by space "all"
          },
        },
      },
    ]);
  });
});
