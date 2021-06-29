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

import { FilterableUsersPopover } from './filterable_users_popover';
import { TableFilterUsersDropdown } from './table_filter_users_dropdown';

const closeFilterUsersDropdown = jest.fn();
const toggleFilterUsersDropdown = jest.fn();

describe('TableFilterUsersDropdown', () => {
  it('renders', () => {
    setMockActions({ closeFilterUsersDropdown, toggleFilterUsersDropdown });
    setMockValues({ users, filteredUsers: [], filterUsersDropdownOpen: false });

    const wrapper = shallow(<TableFilterUsersDropdown />);

    expect(wrapper.find(FilterableUsersPopover)).toHaveLength(1);
  });
});
