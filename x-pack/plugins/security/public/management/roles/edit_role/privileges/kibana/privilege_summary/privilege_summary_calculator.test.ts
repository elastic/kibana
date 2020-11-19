/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../../../../../../common/model';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { PrivilegeSummaryCalculator } from './privilege_summary_calculator';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'unit test role',
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana,
  };
};
describe('PrivilegeSummaryCalculator', () => {
  describe('#getEffectiveFeaturePrivileges', () => {
    it('returns an empty privilege set when nothing is assigned', () => {
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

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
      });
    });

    it('calculates effective privileges when inherited from the global privilege', () => {
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

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: ['cool_all', 'cool_read', 'cool_toggle_1', 'cool_toggle_2'],
        },
      });
    });

    it('calculates effective privileges when there are non-superseded sub-feature privileges', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['cool_excluded_toggle'],
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

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: true,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [
            'cool_all',
            'cool_read',
            'cool_toggle_1',
            'cool_toggle_2',
            'cool_excluded_toggle',
          ],
        },
      });
    });

    it('calculates privileges for all features for a space entry', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['read'],
          feature: {
            excluded_from_base: ['all'],
            no_sub_features: ['read'],
            with_excluded_sub_features: ['all'],
            with_sub_features: ['minimal_read', 'cool_excluded_toggle'],
          },
          spaces: ['foo'],
        },
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: ['cool_all', 'cool_read', 'cool_toggle_1', 'cool_toggle_2'],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: true,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [
            'cool_all',
            'cool_read',
            'cool_toggle_1',
            'cool_toggle_2',
            'cool_excluded_toggle',
          ],
        },
      });
    });

    it('calculates privileges for all features for a global entry', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: ['cool_all', 'cool_read', 'cool_toggle_1', 'cool_toggle_2'],
        },
      });
    });

    it('calculates privileges for a single feature at a space entry', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_excluded_sub_features: ['all'],
          },
          spaces: ['foo'],
        },
      ]);

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
      });
    });

    it('calculates privileges for a single feature at the global entry', () => {
      const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
      const role = createRole([
        {
          base: [],
          feature: {
            with_excluded_sub_features: ['all'],
          },
          spaces: ['*'],
        },
      ]);

      const calculator = new PrivilegeSummaryCalculator(kibanaPrivileges, role);
      expect(calculator.getEffectiveFeaturePrivileges(role.kibana[0])).toEqual({
        excluded_from_base: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        no_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
        with_excluded_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: expect.objectContaining({
            id: 'all',
          }),
          subFeature: [],
        },
        with_sub_features: {
          hasCustomizedSubFeaturePrivileges: false,
          primary: undefined,
          subFeature: [],
        },
      });
    });
  });
});
