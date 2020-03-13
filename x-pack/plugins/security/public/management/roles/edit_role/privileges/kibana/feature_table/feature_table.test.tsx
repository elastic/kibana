/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FeatureTable } from './feature_table';
import { Role } from '../../../../../../../common/model';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { Feature, SubFeatureConfig } from '../../../../../../../../features/public';
import { kibanaFeatures, createFeature } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { getDisplayedFeaturePrivileges } from './__fixtures__';
import { findTestSubject } from 'test_utils/find_test_subject';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

interface TestConfig {
  features: Feature[];
  role: Role;
  privilegeIndex: number;
  calculateDisplayedPrivileges: boolean;
}
const setup = (config: TestConfig) => {
  const kibanaPrivileges = createKibanaPrivileges(config.features);
  const calculator = new PrivilegeFormCalculator(kibanaPrivileges, config.role);
  const onChange = jest.fn();
  const onChangeAll = jest.fn();
  const wrapper = mountWithIntl(
    <FeatureTable
      role={config.role}
      privilegeCalculator={calculator}
      kibanaPrivileges={kibanaPrivileges}
      onChange={onChange}
      onChangeAll={onChangeAll}
      privilegeIndex={config.privilegeIndex}
    />
  );

  const displayedPrivileges = config.calculateDisplayedPrivileges
    ? getDisplayedFeaturePrivileges(wrapper)
    : undefined;

  return {
    wrapper,
    onChange,
    onChangeAll,
    displayedPrivileges,
  };
};

describe('FeatureTable', () => {
  it('renders with no granted privileges for an empty role', () => {
    const role = createRole([
      {
        spaces: [],
        base: [],
        feature: {},
      },
    ]);

    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
    });

    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
      }
    `);
  });

  it('renders with all included privileges granted at the space when space base privilege is "all"', () => {
    const role = createRole([
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
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "all",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_1",
            "with_sub_features_cool_toggle_2",
            "cool_all",
          ],
        },
      }
    `);
  });

  it('renders with sub-feature privileges granted when primary feature privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "unit_test": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "unit_test_sub-toggle-1",
            "unit_test_sub-toggle-2",
            "sub-option-1",
          ],
        },
      }
    `);
  });

  it('renders with some sub-feature privileges granted when primary feature privilege is "read"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['read'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "unit_test": Object {
          "primaryFeaturePrivilege": "read",
          "subFeaturePrivileges": Array [
            "unit_test_sub-toggle-2",
            "sub-toggle-2",
          ],
        },
      }
    `);
  });

  it('renders with excluded sub-feature privileges not granted when primary feature privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "unit_test": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "unit_test_sub-toggle-2",
            "sub-option-1",
          ],
        },
      }
    `);
  });

  it('renders with excluded sub-feature privileges granted when explicitly assigned', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all', 'sub-toggle-1'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "unit_test": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "unit_test_sub-toggle-1",
            "unit_test_sub-toggle-2",
            "sub-option-1",
          ],
        },
      }
    `);
  });

  it('renders with all included sub-feature privileges granted at the space when primary feature privileges are granted', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
    });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_1",
            "with_sub_features_cool_toggle_2",
            "cool_all",
          ],
        },
      }
    `);
  });

  it('renders the most permissive primary feature privilege when multiple are assigned', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['read', 'minimal_all', 'all', 'minimal_read'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
    });

    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_1",
            "with_sub_features_cool_toggle_2",
            "cool_all",
          ],
        },
      }
    `);
  });

  it('renders the most permissive sub-feature privilege when multiple are assigned in a mutually-exclusive group', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all', 'cool_read'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
    });

    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "read",
          "subFeaturePrivileges": Array [
            "cool_all",
          ],
        },
      }
    `);
  });

  it('renders a row expander only for features with sub-features', () => {
    const role = createRole([
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
    ]);
    const { wrapper } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: false,
    });

    kibanaFeatures.forEach(feature => {
      const rowExpander = findTestSubject(wrapper, `expandFeaturePrivilegeRow-${feature.id}`);
      if (!feature.subFeatures || feature.subFeatures.length === 0) {
        expect(rowExpander).toHaveLength(0);
      } else {
        expect(rowExpander).toHaveLength(1);
      }
    });
  });

  it('renders the <FeatureTableExpandedRow> when the row is expanded', () => {
    const role = createRole([
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
    ]);
    const { wrapper } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: false,
    });

    expect(wrapper.find(FeatureTableExpandedRow)).toHaveLength(0);

    findTestSubject(wrapper, 'expandFeaturePrivilegeRow')
      .first()
      .simulate('click');

    expect(wrapper.find(FeatureTableExpandedRow)).toHaveLength(1);
  });

  it('allows all feature privileges to be toggled via "change all"', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);
    const { wrapper, onChangeAll } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
    });

    findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
    findTestSubject(wrapper, 'changeAllPrivileges-read').simulate('click');

    expect(onChangeAll).toHaveBeenCalledWith(['read']);
  });

  it('allows all feature privileges to be unassigned via "change all"', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['all'],
          no_sub_features: ['read'],
          with_excluded_sub_features: ['all', 'something else'],
        },
      },
    ]);
    const { wrapper, onChangeAll } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
    });

    findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
    findTestSubject(wrapper, 'changeAllPrivileges-none').simulate('click');

    expect(onChangeAll).toHaveBeenCalledWith([]);
  });
});
