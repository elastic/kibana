/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../../../../../../common/model';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { PrivilegeSpaceForm } from './privilege_space_form';
import React from 'react';
import { Space } from '../../../../../../../../spaces/public';
import { EuiSuperSelect } from '@elastic/eui';
import { FeatureTable } from '../feature_table';
import { getDisplayedFeaturePrivileges } from '../feature_table/__fixtures__';
import { findTestSubject } from 'test_utils/find_test_subject';
import { SpaceSelector } from './space_selector';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

const displaySpaces: Space[] = [
  {
    id: 'foo',
    name: 'Foo Space',
    disabledFeatures: [],
  },
  {
    id: 'default',
    name: 'Default Space',
    disabledFeatures: [],
  },
  {
    id: '*',
    name: 'Global',
    disabledFeatures: [],
  },
];

describe('PrivilegeSpaceForm', () => {
  it('renders an empty form when the role contains no Kibana privileges', () => {
    const role = createRole();
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(EuiSuperSelect).props().valueOfSelected).toEqual(`basePrivilege_custom`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(true);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
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

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders when a base privilege is selected', () => {
    const role = createRole([
      {
        base: ['all'],
        feature: {},
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(EuiSuperSelect).props().valueOfSelected).toEqual(`basePrivilege_all`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(true);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
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

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders when a feature privileges are selected', () => {
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

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(EuiSuperSelect).props().valueOfSelected).toEqual(`basePrivilege_custom`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(false);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
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
            "with_sub_features_cool_toggle_2",
            "cool_read",
          ],
        },
      }
    `);

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders a warning when configuring a global privilege after space privileges are already defined', () => {
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

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    wrapper.find(SpaceSelector).props().onChange(['*']);

    wrapper.update();

    expect(findTestSubject(wrapper, 'globalPrivilegeWarning')).toHaveLength(1);
  });

  it('renders a warning when space privileges are less permissive than configured global privileges', () => {
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
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(EuiSuperSelect).props().valueOfSelected).toEqual(`basePrivilege_custom`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(false);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
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
            "with_sub_features_cool_toggle_2",
            "cool_read",
          ],
        },
      }
    `);

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'globalPrivilegeWarning')).toHaveLength(0);
  });

  it('allows all feature privileges to be changed via "change all"', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all', 'with_sub_features_cool_toggle_2', 'cool_read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['bar'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={onChange}
        onCancel={jest.fn()}
      />
    );

    findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
    findTestSubject(wrapper, 'changeAllPrivileges-read').simulate('click');
    findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

    expect(onChange).toHaveBeenCalledWith(
      createRole([
        {
          base: [],
          feature: {
            excluded_from_base: ['read'],
            with_excluded_sub_features: ['read'],
            no_sub_features: ['read'],
            with_sub_features: ['read'],
          },
          spaces: ['foo'],
        },
        // this set remains unchanged from the original
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['bar'],
        },
      ])
    );
  });

  it('passes the `canCustomizeSubFeaturePrivileges` prop to the FeatureTable', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const onChange = jest.fn();

    const canCustomize = (Symbol('can customize') as unknown) as boolean;

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={canCustomize}
        privilegeIndex={0}
        onChange={onChange}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(FeatureTable).props().canCustomizeSubFeaturePrivileges).toBe(canCustomize);
  });
});
