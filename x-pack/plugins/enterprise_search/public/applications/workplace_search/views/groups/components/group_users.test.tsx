/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { users } from '../../../__mocks__/users.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { UserIcon } from '../../../components/shared/user_icon';
import { User } from '../../../types';

import { GroupRowUsersDropdown } from './group_row_users_dropdown';
import { GroupUsers } from './group_users';

const props = {
  groupUsers: users,
  usersCount: 1,
  groupId: '123',
};

describe('GroupUsers', () => {
  it('renders', () => {
    const wrapper = shallow(<GroupUsers {...props} />);

    expect(wrapper.find(UserIcon)).toHaveLength(1);
  });

  it('handles hidden users when count is higher than 20', () => {
    const _users = [] as User[];
    const NUM_TOTAL_USERS = 20;

    [...Array(NUM_TOTAL_USERS)].forEach((_, i) => {
      _users.push({
        ...users[0],
        id: i.toString(),
      });
    });

    const wrapper = shallow(<GroupUsers {...props} groupUsers={_users} />);

    // These were needed for 100% test coverage.
    wrapper.find(GroupRowUsersDropdown).invoke('onButtonClick')();
    wrapper.find(GroupRowUsersDropdown).invoke('closePopover')();

    expect(wrapper.find(GroupRowUsersDropdown)).toHaveLength(1);
  });
});
