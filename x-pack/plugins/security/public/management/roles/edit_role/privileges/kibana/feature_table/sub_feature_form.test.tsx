/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiCheckbox } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';

import { KibanaFeature } from '@kbn/features-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import type { Role } from '../../../../../../../common/model';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { SecuredSubFeature } from '../../../../model';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { SubFeatureForm } from './sub_feature_form';

// Note: these tests are not concerned with the proper display of privileges,
// as that is verified by the feature_table and privilege_space_form tests.

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

const featureId = 'with_sub_features';
const subFeature = kibanaFeatures.find((kf) => kf.id === featureId)!.subFeatures[0];
const securedSubFeature = new SecuredSubFeature(subFeature.toRaw());

describe('SubFeatureForm', () => {
  it('renders disabled elements when requested', () => {
    const role = createRole([
      {
        base: [],
        feature: {},
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={[]}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={jest.fn()}
        disabled={true}
      />
    );

    const checkboxes = wrapper.find(EuiCheckbox);
    const buttonGroups = wrapper.find(EuiButtonGroup);

    expect(checkboxes.everyWhere((checkbox) => checkbox.props().disabled === true)).toBe(true);
    expect(buttonGroups.everyWhere((checkbox) => checkbox.props().isDisabled === true)).toBe(true);
  });

  it('fires onChange when an independent privilege is selected', () => {
    const role = createRole([
      {
        base: [],
        feature: {},
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={[]}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    const checkbox = wrapper.find('EuiCheckbox[id="with_sub_features_cool_toggle_1"] input');

    act(() => {
      checkbox.simulate('change', { target: { checked: true } });
    });

    expect(onChange).toHaveBeenCalledWith(['cool_toggle_1']);
  });

  it('fires onChange when an independent privilege is deselected', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['cool_toggle_1', 'cool_toggle_2'],
        },
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={['cool_toggle_1', 'cool_toggle_2']}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    const checkbox = wrapper.find('EuiCheckbox[id="with_sub_features_cool_toggle_1"] input');

    act(() => {
      checkbox.simulate('change', { target: { checked: false } });
    });

    expect(onChange).toHaveBeenCalledWith(['cool_toggle_2']);
  });

  it('fires onChange when a mutually exclusive privilege is selected', () => {
    const role = createRole([
      {
        base: [],
        feature: {},
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={[]}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    const button = wrapper.find(EuiButtonGroup);

    act(() => {
      button.props().onChange('cool_all');
    });

    expect(onChange).toHaveBeenCalledWith(['cool_all']);
  });

  it('fires onChange when switching between mutually exclusive options', () => {
    const role = createRole([
      {
        base: [],
        feature: {},
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={['cool_all', 'cool_toggle_1']}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    const button = wrapper.find(EuiButtonGroup);

    act(() => {
      button.props().onChange('cool_read');
    });

    expect(onChange).toHaveBeenCalledWith(['cool_toggle_1', 'cool_read']);
  });

  it('fires onChange when a mutually exclusive privilege is deselected', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['cool_all'],
        },
        spaces: [],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={featureId}
        subFeature={securedSubFeature}
        selectedFeaturePrivileges={['cool_all']}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    const button = wrapper.find(EuiButtonGroup);

    act(() => {
      button.props().onChange('none');
    });

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('does not render empty privilege groups', () => {
    // privilege groups are filtered server-side to only include the
    // sub-feature privileges that are allowed by the current license.

    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['cool_all'],
        },
        spaces: [],
      },
    ]);
    const feature = new KibanaFeature({
      id: 'test_feature',
      name: 'test feature',
      category: { id: 'test', label: 'test' },
      app: [],
      privileges: {
        all: {
          savedObject: { all: [], read: [] },
          ui: [],
        },
        read: {
          savedObject: { all: [], read: [] },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'subFeature1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [],
            },
          ],
        },
      ],
    });
    const subFeature1 = new SecuredSubFeature(feature.toRaw().subFeatures![0]);
    const kibanaPrivileges = createKibanaPrivileges([feature]);
    const calculator = new PrivilegeFormCalculator(kibanaPrivileges, role);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <SubFeatureForm
        featureId={feature.id}
        subFeature={subFeature1}
        selectedFeaturePrivileges={['cool_all']}
        privilegeCalculator={calculator}
        privilegeIndex={0}
        onChange={onChange}
        disabled={false}
      />
    );

    expect(wrapper.children()).toMatchInlineSnapshot(`null`);
  });
});
