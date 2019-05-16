/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaPrivileges, Role } from '../../../common/model';
import {
  buildRole,
  defaultPrivilegeDefinition,
  fullyRestrictedBasePrivileges,
  fullyRestrictedFeaturePrivileges,
  unrestrictedBasePrivileges,
  unrestrictedFeaturePrivileges,
} from './__fixtures__';
import { KibanaAllowedPrivilegesCalculator } from './kibana_allowed_privileges_calculator';
import { KibanaPrivilegeCalculatorFactory } from './kibana_privileges_calculator_factory';

const buildAllowedPrivilegesCalculator = (
  role: Role,
  kibanaPrivilege: KibanaPrivileges = defaultPrivilegeDefinition
) => {
  return new KibanaAllowedPrivilegesCalculator(kibanaPrivilege, role);
};

const buildEffectivePrivilegesCalculator = (
  role: Role,
  kibanaPrivileges: KibanaPrivileges = defaultPrivilegeDefinition
) => {
  const factory = new KibanaPrivilegeCalculatorFactory(kibanaPrivileges);
  return factory.getInstance(role);
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
