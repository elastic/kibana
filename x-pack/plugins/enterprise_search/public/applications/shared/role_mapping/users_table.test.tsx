/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSingleUserRoleMapping, wsSingleUserRoleMapping, asRoleMapping } from './__mocks__/roles';

import React from 'react';

import { shallow, mount } from 'enzyme';

import { EuiInMemoryTable, EuiTextColor } from '@elastic/eui';

import { engines } from '../../app_search/__mocks__/engines.mock';

import { UsersAndRolesRowActions } from './users_and_roles_row_actions';

import { UsersTable } from './';

describe('UsersTable', () => {
  const initializeSingleUserRoleMapping = jest.fn();
  const handleDeleteMapping = jest.fn();
  const props = {
    accessItemKey: 'groups' as 'groups' | 'engines',
    singleUserRoleMappings: [wsSingleUserRoleMapping],
    initializeSingleUserRoleMapping,
    handleDeleteMapping,
  };

  it('renders', () => {
    const wrapper = shallow(<UsersTable {...props} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
  });

  it('handles manage click', () => {
    const wrapper = mount(<UsersTable {...props} />);
    wrapper.find(UsersAndRolesRowActions).prop('onManageClick')();

    expect(initializeSingleUserRoleMapping).toHaveBeenCalled();
  });

  it('handles delete click', () => {
    const wrapper = mount(<UsersTable {...props} />);
    wrapper.find(UsersAndRolesRowActions).prop('onDeleteClick')();

    expect(handleDeleteMapping).toHaveBeenCalled();
  });

  it('handles display when no email present', () => {
    const userWithNoEmail = {
      ...wsSingleUserRoleMapping,
      elasticsearchUser: {
        email: null,
        username: 'foo',
      },
    };
    const wrapper = mount(<UsersTable {...props} singleUserRoleMappings={[userWithNoEmail]} />);

    expect(wrapper.find(EuiTextColor)).toHaveLength(1);
  });

  it('handles access items display for all items', () => {
    const userWithAllItems = {
      ...asSingleUserRoleMapping,
      roleMapping: {
        ...asRoleMapping,
        engines: [],
      },
    };
    const wrapper = mount(
      <UsersTable {...props} accessItemKey="engines" singleUserRoleMappings={[userWithAllItems]} />
    );

    expect(wrapper.find('[data-test-subj="AllItems"]')).toHaveLength(1);
  });

  it('handles access items display more than 2 items', () => {
    const extraEngine = {
      ...engines[0],
      id: '3',
    };
    const userWithAllItems = {
      ...asSingleUserRoleMapping,
      roleMapping: {
        ...asRoleMapping,
        engines: [...engines, extraEngine],
      },
    };
    const wrapper = mount(
      <UsersTable {...props} accessItemKey="engines" singleUserRoleMappings={[userWithAllItems]} />
    );

    expect(wrapper.find('[data-test-subj="AccessItems"]').prop('children')).toEqual(
      `${engines[0].name}, ${engines[1].name} + 1`
    );
  });
});
