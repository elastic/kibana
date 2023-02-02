/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import type { Role } from '../../../../../../../common/model';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

describe('FeatureTableExpandedRow', () => {
  it('indicates sub-feature privileges are not customizable when licenseAllowsSubFeatPrivCustomization is false', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['minimal_read']}
        onChange={jest.fn()}
        licenseAllowsSubFeatPrivCustomization={false}
        allSpacesSelected={false}
      />
    );

    expect(
      wrapper.find('EuiSwitch[data-test-subj="customizeSubFeaturePrivileges"]').props()
    ).toMatchObject({
      disabled: true,
      checked: false,
    });

    expect(wrapper.find('EuiIconTip[data-test-subj="subFeaturesTip"]').length).toBe(1);
  });

  it('indicates sub-feature privileges can be customized when licenseAllowsSubFeatPrivCustomization is true', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['none']}
        onChange={jest.fn()}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    expect(
      wrapper.find('EuiIconTip[data-test-subj="cannotCustomizeSubFeaturesTooltip"]').length
    ).toBe(0);
  });

  it('indicates sub-feature privileges are being customized if a minimal feature privilege is set', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['minimal_read']}
        onChange={jest.fn()}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    expect(
      wrapper.find('EuiSwitch[data-test-subj="customizeSubFeaturePrivileges"]').props()
    ).toMatchObject({
      disabled: false,
      checked: true,
    });
  });

  it('indicates sub-feature privileges are not being customized if a primary feature privilege is set', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['read']}
        onChange={jest.fn()}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    expect(
      wrapper.find('EuiSwitch[data-test-subj="customizeSubFeaturePrivileges"]').props()
    ).toMatchObject({
      disabled: false,
      checked: false,
    });
  });

  it('does not allow customizing if a primary privilege is not set', () => {
    const role = createRole([
      {
        base: [],
        feature: {},
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['read']}
        onChange={jest.fn()}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    expect(
      wrapper.find('EuiSwitch[data-test-subj="customizeSubFeaturePrivileges"]').props()
    ).toMatchObject({
      disabled: true,
      checked: false,
    });
  });

  it('switches to the minimal privilege when customizing privileges, including corresponding sub-feature privileges', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['read']}
        onChange={onChange}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    act(() => {
      findTestSubject(wrapper, 'customizeSubFeaturePrivileges').simulate('click');
    });

    expect(onChange).toHaveBeenCalledWith('with_sub_features', [
      'minimal_read',
      'cool_read',
      'cool_toggle_2',
    ]);
  });

  it('switches to the primary privilege when not customizing privileges, removing any other privileges', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_read', 'cool_toggle_2'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const feature = kibanaPrivileges.getSecuredFeature('with_sub_features');

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['minimal_read', 'cool_read', 'cool_toggle_2']}
        onChange={onChange}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    act(() => {
      findTestSubject(wrapper, 'customizeSubFeaturePrivileges').simulate('click');
    });

    expect(onChange).toHaveBeenCalledWith('with_sub_features', ['read']);
  });

  it('require all spaces enabled and allSpacesSelected is false: option is disabled', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_require_all_spaces_sub_features: ['cool_toggle_1'],
        },
        spaces: ['foo'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
    const feature = kibanaPrivileges.getSecuredFeature('with_require_all_spaces_sub_features');
    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['minimal_all']}
        onChange={onChange}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={false}
      />
    );

    act(() => {
      findTestSubject(wrapper, 'customizeSubFeaturePrivileges').simulate('click');
    });

    const object = wrapper.find('SubFeatureForm');
    expect(object.props()).toMatchObject({ disabled: true });
  });

  it('require all spaces enabled and allSpacesSelected is true: option is enabled', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_require_all_spaces_sub_features: ['cool_toggle_1'],
        },
        spaces: ['foo'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);
    const feature = kibanaPrivileges.getSecuredFeature('with_require_all_spaces_sub_features');
    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <FeatureTableExpandedRow
        feature={feature}
        privilegeIndex={0}
        privilegeCalculator={calculator}
        selectedFeaturePrivileges={['minimal_all']}
        onChange={onChange}
        licenseAllowsSubFeatPrivCustomization={true}
        allSpacesSelected={true}
      />
    );

    act(() => {
      findTestSubject(wrapper, 'customizeSubFeaturePrivileges').simulate('click');
    });

    const object = wrapper.find('SubFeatureForm');
    expect(object.props()).toMatchObject({ disabled: false });
  });
});
