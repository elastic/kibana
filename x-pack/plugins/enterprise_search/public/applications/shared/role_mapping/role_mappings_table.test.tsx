/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wsRoleMapping, asRoleMapping } from './__mocks__/roles';

import React from 'react';

import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { EuiInMemoryTable, EuiTableHeaderCell, EuiTableRow } from '@elastic/eui';
import type { EuiSearchBarProps } from '@elastic/eui';

import { engines } from '../../app_search/__mocks__/engines.mock';

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
    initializeRoleMapping,
    handleDeleteMapping,
  };

  it('renders', () => {
    const wrapper = mount(<RoleMappingsTable {...props} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(5);
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

  it('handles access items display for all items', () => {
    const wrapper = mount(
      <RoleMappingsTable {...props} roleMappings={[asRoleMapping as any]} accessItemKey="engines" />
    );

    expect(wrapper.find('[data-test-subj="AllItems"]')).toHaveLength(1);
  });

  it('handles access items display more than 2 items', () => {
    const extraEngine = {
      ...engines[0],
      id: '3',
    };

    const roleMapping = {
      ...asRoleMapping,
      engines: [...engines, extraEngine],
      accessAllEngines: false,
    };
    const wrapper = mount(
      <RoleMappingsTable {...props} roleMappings={[roleMapping as any]} accessItemKey="engines" />
    );
    expect(wrapper.find('[data-test-subj="AccessItems"]').prop('children')).toEqual(
      `${engines[0].name}, ${engines[1].name} + 1`
    );
  });

  it('handles search', () => {
    const wrapper = mount(
      <RoleMappingsTable
        {...props}
        roleMappings={[
          { ...wsRoleMapping, roleType: 'admin' },
          { ...wsRoleMapping, roleType: 'user' },
        ]}
      />
    );
    const roleMappingsTable = wrapper.find('[data-test-subj="RoleMappingsTable"]').first();
    const searchProp = roleMappingsTable.prop('search') as EuiSearchBarProps;

    act(() => {
      if (searchProp.onChange) {
        searchProp.onChange({ queryText: 'admin' } as any);
      }
    });
    wrapper.update();

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
  });
});
