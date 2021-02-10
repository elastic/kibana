/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__';
import { users } from '../../../__mocks__/users.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFilterGroup, EuiPopover } from '@elastic/eui';

import { FilterableUsersList } from './filterable_users_list';
import { FilterableUsersPopover } from './filterable_users_popover';

const closePopover = jest.fn();
const addFilteredUser = jest.fn();
const removeFilteredUser = jest.fn();

const props = {
  users,
  closePopover,
  isPopoverOpen: false,
  button: <></>,
};

describe('FilterableUsersPopover', () => {
  beforeEach(() => {
    setMockActions({
      addFilteredUser,
      removeFilteredUser,
    });
  });
  it('renders', () => {
    const wrapper = shallow(<FilterableUsersPopover {...props} />);

    expect(wrapper.find(EuiFilterGroup)).toHaveLength(1);
    expect(wrapper.find(EuiPopover)).toHaveLength(1);
    expect(wrapper.find(FilterableUsersList)).toHaveLength(1);
  });
});
