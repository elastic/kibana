/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wsRoleMapping, asRoleMapping } from './__mocks__/roles';

import React from 'react';

import { mount } from 'enzyme';

import { EuiInMemoryTable, EuiTableHeaderCell } from '@elastic/eui';

import { ALL_LABEL, ANY_AUTH_PROVIDER_OPTION_LABEL } from './constants';

import { RoleMappingsTable } from './role_mappings_table';
import { UsersAndRolesRowActions } from './users_and_roles_row_actions';

describe('RoleMappingsTable', () => {
  const initializeRoleMapping = jest.fn();
  const handleDeleteMapping = jest.fn();
  const roleMappings = [
    {
      ...wsRoleMapping,
      accessItems: [
        {
          name: 'foo',
        },
      ],
    },
  ];

  const props = {
    accessItemKey: 'groups' as 'groups' | 'engines',
    accessHeader: 'access',
    roleMappings,
    addMappingButton: <button />,
    shouldShowAuthProvider: true,
    initializeRoleMapping,
    handleDeleteMapping,
  };

  it('renders with "shouldShowAuthProvider" true', () => {
    const wrapper = mount(<RoleMappingsTable {...props} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(6);
  });

  it('renders with "shouldShowAuthProvider" false', () => {
    const wrapper = mount(<RoleMappingsTable {...props} shouldShowAuthProvider={false} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(5);
  });

  it('renders auth provider display names', () => {
    const wrapper = mount(<RoleMappingsTable {...props} />);

    expect(wrapper.find('[data-test-subj="AuthProviderDisplayValue"]').prop('children')).toEqual(
      `${ANY_AUTH_PROVIDER_OPTION_LABEL}, other_auth`
    );
  });

  it('handles manage click', () => {
    const wrapper = mount(<RoleMappingsTable {...props} />);
    wrapper.find(UsersAndRolesRowActions).prop('onManageClick')();

    expect(initializeRoleMapping).toHaveBeenCalled();
  });

  it('handles delete click', () => {
    const wrapper = mount(<RoleMappingsTable {...props} />);
    wrapper.find(UsersAndRolesRowActions).prop('onDeleteClick')();

    expect(handleDeleteMapping).toHaveBeenCalled();
  });

  it('shows default message when "accessAllEngines" is true', () => {
    const wrapper = mount(
      <RoleMappingsTable {...props} roleMappings={[asRoleMapping as any]} accessItemKey="engines" />
    );

    expect(wrapper.find('[data-test-subj="AccessItemsList"]').prop('children')).toEqual(ALL_LABEL);
  });

  it('handles display when no items present', () => {
    const noItemsRoleMapping = { ...asRoleMapping, engines: [] };
    noItemsRoleMapping.accessAllEngines = false;

    const wrapper = mount(
      <RoleMappingsTable
        {...props}
        roleMappings={[noItemsRoleMapping as any]}
        accessItemKey="engines"
      />
    );

    expect(wrapper.find('[data-test-subj="AccessItemsList"]').children().children().text()).toEqual(
      '—'
    );
  });
});
