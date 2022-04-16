/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import React from 'react';

import type { KibanaFeature, SubFeatureConfig } from '@kbn/features-plugin/public';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import type { Role } from '../../../../../../../common/model';
import { createFeature, kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { getDisplayedFeaturePrivileges } from './__fixtures__';
import { FeatureTable } from './feature_table';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

interface TestConfig {
  features: KibanaFeature[];
  role: Role;
  privilegeIndex: number;
  calculateDisplayedPrivileges: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
}
const setup = (config: TestConfig) => {
  const kibanaPrivileges = createKibanaPrivileges(config.features, {
    allowSubFeaturePrivileges: config.canCustomizeSubFeaturePrivileges,
  });
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
      canCustomizeSubFeaturePrivileges={config.canCustomizeSubFeaturePrivileges}
      privilegeIndex={config.privilegeIndex}
      allSpacesSelected={true}
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
  [true, false].forEach((canCustomizeSubFeaturePrivileges) => {
    describe(`with sub feature privileges ${
      canCustomizeSubFeaturePrivileges ? 'allowed' : 'disallowed'
    }`, () => {
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
          canCustomizeSubFeaturePrivileges,
        });

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
        });
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
          canCustomizeSubFeaturePrivileges,
        });
        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'all',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'all',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? {
                  subFeaturePrivileges: [
                    'with_sub_features_cool_toggle_1',
                    'with_sub_features_cool_toggle_2',
                    'cool_all',
                  ],
                }
              : { subFeaturePrivileges: [] }),
          },
        });
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
          canCustomizeSubFeaturePrivileges,
        });

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? {
                  subFeaturePrivileges: [
                    'with_sub_features_cool_toggle_1',
                    'with_sub_features_cool_toggle_2',
                    'cool_all',
                  ],
                }
              : { subFeaturePrivileges: [] }),
          },
        });
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
          canCustomizeSubFeaturePrivileges,
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
          canCustomizeSubFeaturePrivileges,
        });

        findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
        findTestSubject(wrapper, 'changeAllPrivileges-none').simulate('click');

        expect(onChangeAll).toHaveBeenCalledWith([]);
      });
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: ['cool_all'],
      },
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });

    kibanaFeatures.forEach((feature) => {
      const { arrowDisplay } = wrapper
        .find(EuiAccordion)
        .filter(`#featurePrivilegeControls_${feature.id}`)
        .props();
      if (!feature.subFeatures || feature.subFeatures.length === 0) {
        expect(arrowDisplay).toEqual('none');
      } else {
        expect(arrowDisplay).toEqual('left');
      }
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-1', 'unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: ['unit_test_sub-toggle-2', 'sub-toggle-2'],
      },
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-1', 'unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
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
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: [
          'with_sub_features_cool_toggle_1',
          'with_sub_features_cool_toggle_2',
          'cool_all',
        ],
      },
    });
  });

  it('renders with privileges granted when minimal feature privileges are assigned, and sub-feature privileges are disallowed', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders with privileges granted when sub feature privileges are assigned, and sub-feature privileges are disallowed', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders a description for features with only reserved privileges (omitting the primary feature controls)', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);
    const reservedFeature = createFeature({
      id: 'reserved_feature',
      name: 'Reserved Feature',
      privileges: null,
      reserved: {
        description: 'this is my reserved feature description',
        privileges: [
          {
            id: 'priv_1',
            privilege: {
              api: [],
              savedObject: { all: [], read: [] },
              ui: [],
            },
          },
        ],
      },
    });

    const { wrapper } = setup({
      role,
      features: [reservedFeature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(findTestSubject(wrapper, 'reservedFeatureDescription').text()).toMatchInlineSnapshot(
      `"this is my reserved feature description"`
    );

    expect(findTestSubject(wrapper, 'primaryFeaturePrivilegeControl')).toHaveLength(0);
  });

  it('renders renders the primary feature controls when both primary and reserved privileges are specified', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);
    const reservedFeature = createFeature({
      id: 'reserved_feature',
      name: 'Reserved Feature with primary feature privileges',
      reserved: {
        description: 'this is my reserved feature description',
        privileges: [
          {
            id: 'priv_1',
            privilege: {
              api: [],
              savedObject: { all: [], read: [] },
              ui: [],
            },
          },
        ],
      },
    });

    const { displayedPrivileges, wrapper } = setup({
      role,
      features: [reservedFeature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(findTestSubject(wrapper, 'reservedFeatureDescription')).toHaveLength(0);
    expect(displayedPrivileges).toEqual({
      reserved_feature: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('does not render features which lack privileges', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);

    const featureWithoutPrivileges = createFeature({
      id: 'no_privs',
      name: 'No Privileges Feature',
      privileges: null,
    });

    const { displayedPrivileges } = setup({
      role,
      features: [...kibanaFeatures, featureWithoutPrivileges],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders features by category, indicating how many features are granted within', async () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          feature_1: ['all'],
          feature_3: ['all'],
          feature_4: ['all'],
        },
      },
    ]);

    const features = [
      createFeature({
        id: 'feature_1',
        name: 'Feature1',
        category: { id: 'foo', label: 'foo' },
      }),
      createFeature({
        id: 'feature_2',
        name: 'Feature2',
        category: { id: 'foo', label: 'foo' },
      }),
      createFeature({
        id: 'feature_3',
        name: 'Feature3',
        category: { id: 'bar', label: 'bar' },
      }),
      createFeature({
        id: 'feature_4',
        name: 'Feature4',
        category: { id: 'bar', label: 'bar' },
      }),
    ];

    const { wrapper } = setup({
      role,
      features,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    const fooCategory = findTestSubject(wrapper, 'featureCategory_foo');
    const barCategory = findTestSubject(wrapper, 'featureCategory_bar');

    expect(fooCategory).toHaveLength(1);
    expect(barCategory).toHaveLength(1);

    expect(findTestSubject(fooCategory, 'categoryLabel').text()).toMatchInlineSnapshot(
      `"1 / 2 features granted"`
    );

    expect(findTestSubject(barCategory, 'categoryLabel').text()).toMatchInlineSnapshot(
      `"2 / 2 features granted"`
    );
  });
});
