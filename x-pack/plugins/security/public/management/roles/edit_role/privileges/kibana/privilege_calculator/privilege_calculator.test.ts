/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createKibanaPrivileges } from '../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../__fixtures__/kibana_features';
import { PrivilegeCalculator } from './privilege_calculator';
import { Role } from '../../../../../../../common/model';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

describe('PrivilegeCalculator', () => {
  describe('#canCustomizeSubFeaturePrivileges', () => {
    it('returns false when no primary feature privileges are assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns false when only sub feature privileges are assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true when a primary feature privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a minimal primary feature privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a minimal primary feature privilege is inherited', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_all'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a primary feature privilege is inherited', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['read'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns false when all available sub-features are inherited by a feature privilege', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns false when all available sub-features are inherited by a base privilege', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
        {
          base: ['all'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true in this hard-to-describe scenario', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
        {
          base: ['read'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, 0);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });
  });
});
