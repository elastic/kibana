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

const getCalculator = (kibana: Role['kibana'] = [], privilegeIndex = 0) => {
  const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
  const role = createRole(kibana);
  return new PrivilegeCalculator(kibanaPrivileges).getScopedInstance(role, privilegeIndex);
};

describe('PrivilegeCalculator', () => {
  describe('#canCustomizeSubFeaturePrivileges', () => {
    it('returns false when no primary feature privileges are assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true when only sub feature privileges are assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a primary feature privilege is assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a minimal primary feature privilege is assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_all'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a minimal primary feature privilege is inherited', () => {
      const calculator = getCalculator([
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

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a primary feature privilege is inherited', () => {
      const calculator = getCalculator([
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

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns false when all available sub-features are inherited by a feature privilege', () => {
      const calculator = getCalculator([
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

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns false when all available sub-features are inherited by a base privilege', () => {
      const calculator = getCalculator([
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

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true in this hard-to-describe scenario', () => {
      const calculator = getCalculator([
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
      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when inheriting base privilege which does not grant all sub privileges', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: [],
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

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns false when inheriting non-superseded sub privileges', () => {
      const calculator = getCalculator([
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
            with_sub_features: ['minimal_read', 'cool_all'],
          },
          spaces: ['*'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true when inheriting sub privileges which are superseded by assigned primary feature privilege', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read', 'cool_all'],
          },
          spaces: ['*'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when inheriting sub privileges which are not superseded by assigned primary feature privilege', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_all'],
          },
          spaces: ['foo'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read', 'cool_all'],
          },
          spaces: ['*'],
        },
      ]);

      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });
  });

  describe('#isCustomizingSubFeaturePrivileges', () => {
    it('returns false when a base privilege is directly assigned which grants all privileges', () => {
      const calculator = getCalculator([
        {
          base: ['all'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns false when nothing is assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);
      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true when a minimal feature privilege is assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns true when a minimal feature privilege is inherited', () => {
      const calculator = getCalculator([
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
            with_sub_features: ['minimal_read'],
          },
          spaces: ['*'],
        },
      ]);

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns false when a non-minimal feature privilege is inherited', () => {
      const calculator = getCalculator([
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

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });

    it('returns true when a minimal feature privilege is assigned which is otherwise superseded by a global feature privilege', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
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

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(true);
    });

    it('returns false when a minimal feature privilege is assigned which is otherwise superseded by a global feature privilege which grants all privileges', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
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

      expect(calculator.isCustomizingSubFeaturePrivileges('with_sub_features')).toEqual(false);
    });
  });

  describe('#toggleMinimalPrimaryFeaturePrivilege', () => {
    it('returns the minimal version of the primary feature privilege when the non-minimal version is currently assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['read'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.toggleMinimalPrimaryFeaturePrivilege('with_sub_features')?.id).toEqual(
        'minimal_read'
      );
    });

    it('returns the non-minimal version of the primary feature privilege when the minimal version is currently assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(calculator.toggleMinimalPrimaryFeaturePrivilege('with_sub_features')?.id).toEqual(
        'read'
      );
    });

    it('returns the minimal version of the primary feature privilege when the non-minimal version is inherited', () => {
      const calculator = getCalculator([
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

      expect(calculator.toggleMinimalPrimaryFeaturePrivilege('with_sub_features')?.id).toEqual(
        'minimal_read'
      );
    });

    it('returns undefined when toggling off a minimal feature privilege which is superseded by an inherited privilege', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
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

      expect(calculator.toggleMinimalPrimaryFeaturePrivilege('with_sub_features')).toBeUndefined();
    });

    it('throws when no primary feature privileges are assigned', () => {
      const calculator = getCalculator([
        {
          base: [],
          feature: {
            with_sub_features: ['cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      expect(() =>
        calculator.toggleMinimalPrimaryFeaturePrivilege('with_sub_features')
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected an effective minimal/non-minimal primary feature privilege to be assigned."`
      );
    });
  });
});
