/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { Role } from '../../../../../../../common/model';
import { PrivilegeFormCalculator } from './privilege_form_calculator';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'unit test role',
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana,
  };
};

describe('PrivilegeFormCalculator', () => {
  describe('#getBasePrivilege', () => {
    it(`returns undefined when no base privilege is assigned`, () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getBasePrivilege(0)).toBeUndefined();
    });

    it(`ignores unknown base privileges`, () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['unknown'],
          feature: {},
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getBasePrivilege(0)).toBeUndefined();
    });

    it(`returns the assigned base privilege`, () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read'],
          feature: {},
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getBasePrivilege(0)).toMatchObject({
        id: 'read',
      });
    });

    it(`returns the most permissive base privilege when multiple are assigned`, () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read', 'all'],
          feature: {},
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getBasePrivilege(0)).toMatchObject({
        id: 'all',
      });
    });
  });

  describe('#getDisplayedPrimaryFeaturePrivilegeId', () => {
    it('returns undefined when no privileges are assigned', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getDisplayedPrimaryFeaturePrivilegeId('with_sub_features', 0)
      ).toBeUndefined();
    });

    it('returns the effective privilege id when a base privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getDisplayedPrimaryFeaturePrivilegeId('with_sub_features', 0)).toEqual(
        'all'
      );
    });

    it('returns the most permissive assigned primary feature privilege id', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['read', 'all', 'minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getDisplayedPrimaryFeaturePrivilegeId('with_sub_features', 0)).toEqual(
        'all'
      );
    });

    it('returns the primary version of the minimal privilege id when assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getDisplayedPrimaryFeaturePrivilegeId('with_sub_features', 0)).toEqual(
        'read'
      );
    });
  });

  describe('#hasCustomizedSubFeaturePrivileges', () => {
    it('returns false when no privileges are assigned', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns false when there are no sub-feature privileges assigned', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns false when the assigned sub-features are also granted by other assigned privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all', 'cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns true when the assigned sub-features are not also granted by other assigned privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['read', 'cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(true);
    });

    it('returns true when a minimal primary feature privilege is assigned, whose corresponding primary grants sub-feature privileges which are not assigned ', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(true);
    });

    it('returns false when a minimal primary feature privilege is assigned, whose corresponding primary grants sub-feature privileges which are all assigned ', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read', 'cool_read', 'cool_toggle_2'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns true when a minimal primary feature privilege is assigned, whose corresponding primary does not grant all assigned sub-feature privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: [
              'minimal_read',
              'cool_read',
              'cool_toggle_2',
              'cool_excluded_toggle',
            ],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(true);
    });

    it('returns false when a base privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.hasCustomizedSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });
  });

  describe('#getEffectivePrimaryFeaturePrivilege', () => {
    it('returns undefined when no privileges are assigned', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)
      ).toBeUndefined();
    });

    it('returns the most permissive feature privilege granted by the assigned base privilege', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)).toMatchObject({
        id: 'read',
      });
    });

    it('returns the most permissive feature privilege granted by the assigned feature privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read'],
          feature: {
            with_sub_features: ['read', 'all', 'minimal_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)).toMatchObject({
        id: 'all',
      });
    });

    it('prefers `read` primary over `mininal_all`', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_all', 'read'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)).toMatchObject({
        id: 'read',
      });
    });

    it('returns the minimal primary feature privilege when assigned and not superseded', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)).toMatchObject({
        id: 'minimal_all',
      });
    });

    it('ignores unknown privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['unknown'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getEffectivePrimaryFeaturePrivilege('with_sub_features', 0)
      ).toBeUndefined();
    });
  });

  describe('#isIndependentSubFeaturePrivilegeGranted', () => {
    it('returns false when no privileges are assigned', () => {
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.isIndependentSubFeaturePrivilegeGranted('with_sub_features', 'cool_toggle_1', 0)
      ).toEqual(false);
    });

    it('returns false when an excluded sub-feature privilege is not directly assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.isIndependentSubFeaturePrivilegeGranted(
          'with_sub_features',
          'cool_excluded_toggle',
          0
        )
      ).toEqual(false);
    });

    it('returns true when an excluded sub-feature privilege is directly assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: ['all', 'cool_excluded_toggle'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.isIndependentSubFeaturePrivilegeGranted(
          'with_sub_features',
          'cool_excluded_toggle',
          0
        )
      ).toEqual(true);
    });

    it('returns true when a sub-feature privilege is directly assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: ['all', 'cool_toggle_1'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.isIndependentSubFeaturePrivilegeGranted('with_sub_features', 'cool_toggle_1', 0)
      ).toEqual(true);
    });

    it('returns true when a sub-feature privilege is inherited', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.isIndependentSubFeaturePrivilegeGranted('with_sub_features', 'cool_toggle_1', 0)
      ).toEqual(true);
    });
  });

  describe('#getSelectedMutuallyExclusiveSubFeaturePrivilege', () => {
    it('returns undefined when no privileges are assigned', () => {
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

      const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');
      const coolSubFeature = feature.getSubFeatures().find((sf) => sf.name === 'Cool Sub Feature')!;
      const subFeatureGroup = coolSubFeature
        .getPrivilegeGroups()
        .find((pg) => pg.groupType === 'mutually_exclusive')!;

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getSelectedMutuallyExclusiveSubFeaturePrivilege(
          'with_sub_features',
          subFeatureGroup,
          0
        )
      ).toBeUndefined();
    });

    it('returns the inherited privilege when not directly assigned', () => {
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

      const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');
      const coolSubFeature = feature.getSubFeatures().find((sf) => sf.name === 'Cool Sub Feature')!;
      const subFeatureGroup = coolSubFeature
        .getPrivilegeGroups()
        .find((pg) => pg.groupType === 'mutually_exclusive')!;

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getSelectedMutuallyExclusiveSubFeaturePrivilege(
          'with_sub_features',
          subFeatureGroup,
          0
        )
      ).toMatchObject({
        id: 'cool_all',
      });
    });

    it('returns the the most permissive effective privilege', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all', 'cool_read', 'cool_all'],
          },
          spaces: ['foo'],
        },
      ]);

      const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');
      const coolSubFeature = feature.getSubFeatures().find((sf) => sf.name === 'Cool Sub Feature')!;
      const subFeatureGroup = coolSubFeature
        .getPrivilegeGroups()
        .find((pg) => pg.groupType === 'mutually_exclusive')!;

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(
        calculator.getSelectedMutuallyExclusiveSubFeaturePrivilege(
          'with_sub_features',
          subFeatureGroup,
          0
        )
      ).toMatchObject({
        id: 'cool_all',
      });
    });
  });

  describe('#canCustomizeSubFeaturePrivileges', () => {
    it('returns false if no privileges are assigned', () => {
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
      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns false if a base privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {
            with_sub_features: [],
          },
          spaces: ['foo'],
        },
      ]);
      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features', 0)).toEqual(false);
    });

    it('returns true if a minimal privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read'],
          },
          spaces: ['foo'],
        },
      ]);
      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features', 0)).toEqual(true);
    });

    it('returns true if a primary feature privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['read'],
          },
          spaces: ['foo'],
        },
      ]);
      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
      expect(calculator.canCustomizeSubFeaturePrivileges('with_sub_features', 0)).toEqual(true);
    });
  });

  describe('#updateSelectedFeaturePrivilegesForCustomization', () => {
    it('returns the privileges unmodified if no primary feature privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['some-privilege'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(
        calculator.updateSelectedFeaturePrivilegesForCustomization('with_sub_features', 0, true)
      ).toEqual(['some-privilege']);

      expect(
        calculator.updateSelectedFeaturePrivilegesForCustomization('with_sub_features', 0, false)
      ).toEqual(['some-privilege']);
    });

    it('switches to the minimal privilege when customizing, but explicitly grants the sub-feature privileges which were originally inherited', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['read'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(
        calculator.updateSelectedFeaturePrivilegesForCustomization('with_sub_features', 0, true)
      ).toEqual(['minimal_read', 'cool_read', 'cool_toggle_2']);
    });

    it('switches to the non-minimal privilege when customizing, removing all other privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['minimal_read', 'cool_read', 'cool_toggle_2'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(
        calculator.updateSelectedFeaturePrivilegesForCustomization('with_sub_features', 0, false)
      ).toEqual(['read']);
    });
  });

  describe('#hasSupersededInheritedPrivileges', () => {
    // More exhaustive testing is done at the UI layer: `privilege_space_table.test.tsx`
    it('returns false for the global privilege definition', () => {
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
          base: ['all'],
          feature: {
            with_sub_features: ['read'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(calculator.hasSupersededInheritedPrivileges(1)).toEqual(false);
    });

    it('returns false when the global privilege is not more permissive', () => {
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
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(calculator.hasSupersededInheritedPrivileges(0)).toEqual(false);
    });

    it('returns true when the global feature privilege is more permissive', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['read'],
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

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(calculator.hasSupersededInheritedPrivileges(0)).toEqual(true);
    });

    it('returns true when the global base privilege is more permissive', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read'],
          feature: {},
          spaces: ['foo'],
        },
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(calculator.hasSupersededInheritedPrivileges(0)).toEqual(true);
    });

    it('returns false when only the global base privilege is assigned', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {},
          spaces: ['foo'],
        },
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

      expect(calculator.hasSupersededInheritedPrivileges(0)).toEqual(false);
    });
  });
});
