/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { PrivilegeSummaryTable } from './privilege_summary_table';
import { RoleKibanaPrivilege } from '../../../../../../../common/model';
import { getDisplayedFeaturePrivileges } from './__fixtures__';

const createRole = (roleKibanaPrivileges: RoleKibanaPrivilege[]) => ({
  name: 'some-role',
  elasticsearch: {
    cluster: [],
    indices: [],
    run_as: [],
  },
  kibana: roleKibanaPrivileges,
});

const spaces = [
  {
    id: 'default',
    name: 'Default Space',
    disabledFeatures: [],
  },
  {
    id: 'space-1',
    name: 'First Space',
    disabledFeatures: [],
  },
  {
    id: 'space-2',
    name: 'Second Space',
    disabledFeatures: [],
  },
];

const expectNoPrivileges = (displayedPrivileges: any) => {
  expect(displayedPrivileges).toEqual({
    excluded_from_base: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
        subFeaturesPrivileges: {
          'Cool Sub Feature': [],
        },
      },
    },
    no_sub_features: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
      },
    },
    with_excluded_sub_features: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
        subFeaturesPrivileges: {
          'Excluded Sub Feature': [],
        },
      },
    },
    with_sub_features: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
        subFeaturesPrivileges: {
          'Cool Sub Feature': [],
        },
      },
    },
  });
};

describe('PrivilegeSummaryTable', () => {
  it('ignores unknown base privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['idk_what_this_means'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expectNoPrivileges(displayedPrivileges);
  });

  it('ignores unknown feature privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['this_doesnt_exist_either'],
        },
        spaces: ['*'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expectNoPrivileges(displayedPrivileges);
  });

  it('ignores unknown features', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: [],
        feature: {
          unknown_feature: ['this_doesnt_exist_either'],
        },
        spaces: ['*'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expectNoPrivileges(displayedPrivileges);
  });

  it('renders effective privileges for the global base privilege', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for a global feature privilege', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['all'],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['*'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for the space base privilege', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['all'],
        feature: {},
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
      },
      with_excluded_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for a space feature privilege', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
        },
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
        },
      },
      with_excluded_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
    });
  });

  it('renders effective privileges for global base + space base privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
      {
        base: ['all'],
        feature: {},
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'Read'],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for global base + space feature privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all'],
        },
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'Read'],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: true,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for global feature + space base privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all'],
        },
        spaces: ['*'],
      },
      {
        base: ['read'],
        feature: {},
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: true,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['All'],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: true,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for global feature + space feature privileges', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all'],
        },
        spaces: ['*'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['default', 'space-1'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: true,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['All'],
          },
        },
        'default, space-1': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });

  it('renders effective privileges for a complex setup', () => {
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const role = createRole([
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
      {
        base: ['read', 'all'],
        feature: {},
        spaces: ['default'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['minimal_read'],
          with_excluded_sub_features: ['all', 'cool_toggle_1'],
          no_sub_features: ['all'],
          excluded_from_base: ['minimal_all', 'cool_toggle_1'],
        },
        spaces: ['space-1', 'space-2', 'unknown-space'],
      },
    ]);

    const wrapper = mountWithIntl(
      <PrivilegeSummaryTable spaces={spaces} kibanaPrivileges={kibanaPrivileges} role={role} />
    );

    const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);
    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
        default: {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2'],
          },
        },
        'space-1, space-2, unknown-space': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'None',
          subFeaturesPrivileges: {
            'Cool Sub Feature': [],
          },
        },
      },
      no_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
        },
        default: {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
        'space-1, space-2, unknown-space': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
        },
      },
      with_excluded_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
        default: {
          hasCustomizedSubFeaturePrivileges: true,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': ['Cool toggle 1'],
          },
        },
        'space-1, space-2, unknown-space': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Excluded Sub Feature': [],
          },
        },
      },
      with_sub_features: {
        '*': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'Read'],
          },
        },
        default: {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'Read',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 2', 'Read'],
          },
        },
        'space-1, space-2, unknown-space': {
          hasCustomizedSubFeaturePrivileges: false,
          primaryFeaturePrivilege: 'All',
          subFeaturesPrivileges: {
            'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
          },
        },
      },
    });
  });
});
