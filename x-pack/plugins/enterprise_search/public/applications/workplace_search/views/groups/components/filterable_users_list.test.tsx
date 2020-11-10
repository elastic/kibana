/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';

import { users } from '../../../__mocks__/users.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiFieldSearch, EuiFilterSelectItem, EuiCard, EuiPopoverTitle } from '@elastic/eui';

import { FilterableUsersList } from './filterable_users_list';

import { IUser } from '../../../types';

const mockSetState = jest.fn();
const useStateMock: any = (initState: any) => [initState, mockSetState];

const addFilteredUser = jest.fn();
const removeFilteredUser = jest.fn();

const props = {
  users,
  addFilteredUser,
  removeFilteredUser,
};

describe('FilterableUsersList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<FilterableUsersList {...props} />);

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
    expect(wrapper.find(EuiCard)).toHaveLength(0);
  });

  it('updates the input value and renders zero users card', () => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);
    const _users = [
      users[0],
      {
        ...users[0],
        id: 'asdfa',
        email: 'user@example.co',
        name: null,
      },
    ];

    const wrapper = shallow(<FilterableUsersList {...props} users={_users} />);

    const input = wrapper.find(EuiFieldSearch);
    input.simulate('change', { target: { value: 'bar' } });

    expect(wrapper.find(EuiCard)).toHaveLength(1);
    expect(wrapper.find(EuiFilterSelectItem)).toHaveLength(0);
  });

  it('handles adding and removing users', () => {
    const _users = [
      users[0],
      {
        ...users[0],
        id: 'asdfa',
      },
    ];

    const wrapper = shallow(
      <FilterableUsersList {...props} users={_users} itemsClickable selectedOptions={['1z1z']} />
    );
    const firstItem = wrapper.find(EuiFilterSelectItem).first();
    firstItem.simulate('click');

    expect(removeFilteredUser).toHaveBeenCalled();
    expect(addFilteredUser).not.toHaveBeenCalled();

    const secondItem = wrapper.find(EuiFilterSelectItem).last();
    secondItem.simulate('click');

    expect(addFilteredUser).toHaveBeenCalled();
  });

  it('renders loading when no users', () => {
    const wrapper = shallow(
      <FilterableUsersList {...props} users={[]} allGroupUsersLoading={<>loading</>} />
    );
    const card = wrapper.find(EuiCard);

    expect((card.prop('description') as any).props.children).toEqual('loading');
  });

  it('handles hidden users when count is higher than 20', () => {
    const _users = [] as IUser[];
    const NUM_TOTAL_USERS = 30;
    const NUM_VISIBLE_USERS = 20;

    [...Array(NUM_TOTAL_USERS)].forEach((_, i) => {
      _users.push({
        ...users[0],
        id: i.toString(),
      });
    });

    const wrapper = shallow(<FilterableUsersList itemsClickable {...props} users={_users} />);

    expect(wrapper.find(EuiFilterSelectItem)).toHaveLength(NUM_VISIBLE_USERS);
  });

  it('renders elements wrapped when popover', () => {
    const wrapper = shallow(<FilterableUsersList isPopover {...props} />);

    expect(wrapper.find(EuiPopoverTitle)).toHaveLength(1);
    expect(wrapper.find('.euiFilterSelect__items')).toHaveLength(1);
  });
});
