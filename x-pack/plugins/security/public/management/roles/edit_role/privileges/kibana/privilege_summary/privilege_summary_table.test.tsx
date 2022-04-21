/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { spacesManagerMock } from '@kbn/spaces-plugin/public/spaces_manager/mocks';
import { getUiApi } from '@kbn/spaces-plugin/public/ui_api';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import type { RoleKibanaPrivilege } from '../../../../../../../common/model';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { getDisplayedFeaturePrivileges } from './__fixtures__';
import type { PrivilegeSummaryTableProps } from './privilege_summary_table';
import { PrivilegeSummaryTable } from './privilege_summary_table';

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
const spacesManager = spacesManagerMock.create();
const { getStartServices } = coreMock.createSetup();
const spacesApiUi = getUiApi({ spacesManager, getStartServices });

const maybeExpectSubFeaturePrivileges = (expect: boolean, subFeaturesPrivileges: unknown) => {
  return expect ? { subFeaturesPrivileges } : {};
};

const expectNoPrivileges = (displayedPrivileges: any, expectSubFeatures: boolean) => {
  expect(displayedPrivileges).toEqual({
    excluded_from_base: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
        ...maybeExpectSubFeaturePrivileges(expectSubFeatures, {
          'Cool Sub Feature': [],
        }),
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
        ...maybeExpectSubFeaturePrivileges(expectSubFeatures, {
          'Excluded Sub Feature': [],
        }),
      },
    },
    with_sub_features: {
      '*': {
        hasCustomizedSubFeaturePrivileges: false,
        primaryFeaturePrivilege: 'None',
        ...maybeExpectSubFeaturePrivileges(expectSubFeatures, {
          'Cool Sub Feature': [],
        }),
      },
    },
  });
};

const setup = async (props: PrivilegeSummaryTableProps) => {
  const wrapper = mountWithIntl(<PrivilegeSummaryTable {...props} />);

  // lazy-load SpaceAvatar
  await act(async () => {
    wrapper.update();
  });

  return wrapper;
};

describe('PrivilegeSummaryTable', () => {
  [true, false].forEach((allowSubFeaturePrivileges) => {
    describe(`when sub feature privileges are ${
      allowSubFeaturePrivileges ? 'allowed' : 'disallowed'
    }`, () => {
      it('ignores unknown base privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: ['idk_what_this_means'],
            feature: {},
            spaces: ['*'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expectNoPrivileges(displayedPrivileges, allowSubFeaturePrivileges);
      });

      it('ignores unknown feature privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: [],
            feature: {
              with_sub_features: ['this_doesnt_exist_either'],
            },
            spaces: ['*'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expectNoPrivileges(displayedPrivileges, allowSubFeaturePrivileges);
      });

      it('ignores unknown features', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: [],
            feature: {
              unknown_feature: ['this_doesnt_exist_either'],
            },
            spaces: ['*'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expectNoPrivileges(displayedPrivileges, allowSubFeaturePrivileges);
      });

      it('renders effective privileges for the global base privilege', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for a global feature privilege', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: ['all'],
            feature: {
              with_sub_features: ['minimal_read'],
            },
            spaces: ['*'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for the space base privilege', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: ['all'],
            feature: {},
            spaces: ['default', 'space-1'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for a space feature privilege', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

        const role = createRole([
          {
            base: [],
            feature: {
              with_sub_features: ['minimal_read'],
            },
            spaces: ['default', 'space-1'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
          },
        });
      });

      it('renders effective privileges for global base + space base privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

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

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'Read'],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for global base + space feature privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

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

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'Read'],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for global feature + space base privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

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

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['All'],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for global feature + space feature privileges', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

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

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
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
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['All'],
              }),
            },
            'default, space-1': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
          },
        });
      });

      it('renders effective privileges for a complex setup', async () => {
        const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures, {
          allowSubFeaturePrivileges,
        });

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
            spaces: ['space-1', 'space-2'],
          },
        ]);

        const wrapper = await setup({
          spaces,
          kibanaPrivileges,
          role,
          canCustomizeSubFeaturePrivileges: allowSubFeaturePrivileges,
          spacesApiUi,
        });

        const displayedPrivileges = getDisplayedFeaturePrivileges(wrapper, role);

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            default: {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'None',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': [],
              }),
            },
            'space-1, space-2': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2'],
              }),
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
            'space-1, space-2': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
            },
          },
          with_excluded_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            default: {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': [],
              }),
            },
            'space-1, space-2': {
              hasCustomizedSubFeaturePrivileges: allowSubFeaturePrivileges,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Excluded Sub Feature': ['Cool toggle 1'],
              }),
            },
          },
          with_sub_features: {
            '*': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'Read'],
              }),
            },
            default: {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'All',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 1', 'Cool toggle 2', 'All'],
              }),
            },
            'space-1, space-2': {
              hasCustomizedSubFeaturePrivileges: false,
              primaryFeaturePrivilege: 'Read',
              ...maybeExpectSubFeaturePrivileges(allowSubFeaturePrivileges, {
                'Cool Sub Feature': ['Cool toggle 2', 'Read'],
              }),
            },
          },
        });
      });
    });
  });
});
