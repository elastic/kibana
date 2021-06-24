/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { users } from '../../../__mocks__/users.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { FilterableUsersList } from './filterable_users_list';
import { GroupManagerModal } from './group_manager_modal';
import { ManageUsersModal } from './manage_users_modal';

const addGroupUser = jest.fn();
const removeGroupUser = jest.fn();
const selectAllUsers = jest.fn();
const hideManageUsersModal = jest.fn();
const saveGroupUsers = jest.fn();

describe('ManageUsersModal', () => {
  it('renders', () => {
    setMockActions({
      addGroupUser,
      removeGroupUser,
      selectAllUsers,
      hideManageUsersModal,
      saveGroupUsers,
    });

    setMockValues({
      users,
      selectedGroupUsers: [],
    });

    const wrapper = shallow(<ManageUsersModal />);

    expect(wrapper.find(FilterableUsersList)).toHaveLength(1);
    expect(wrapper.find(GroupManagerModal)).toHaveLength(1);
  });
});
