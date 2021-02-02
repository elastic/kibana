/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__';
import { users } from '../../../__mocks__/users.mock';

import React from 'react';
import { shallow, mount } from 'enzyme';

import { EuiLoadingContent, EuiButtonEmpty } from '@elastic/eui';

import { GroupRowUsersDropdown } from './group_row_users_dropdown';
import { FilterableUsersPopover } from './filterable_users_popover';

const fetchGroupUsers = jest.fn();
const onButtonClick = jest.fn();
const closePopover = jest.fn();

const props = {
  isPopoverOpen: true,
  numOptions: 1,
  groupId: '123',
  onButtonClick,
  closePopover,
};
describe('GroupRowUsersDropdown', () => {
  beforeEach(() => {
    setMockActions({ fetchGroupUsers });
    setMockValues({
      allGroupUsers: users,
      allGroupUsersLoading: false,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<GroupRowUsersDropdown {...props} />);

    expect(wrapper.find(FilterableUsersPopover)).toHaveLength(1);
  });

  it('handles toggle click', () => {
    const wrapper = mount(<GroupRowUsersDropdown {...props} />);

    const button = wrapper.find(EuiButtonEmpty);
    button.simulate('click');

    expect(fetchGroupUsers).toHaveBeenCalledWith('123');
    expect(onButtonClick).toHaveBeenCalled();
  });

  it('handles loading state', () => {
    setMockValues({
      allGroupUsers: users,
      allGroupUsersLoading: true,
    });
    const wrapper = shallow(<GroupRowUsersDropdown {...props} />);
    const popover = wrapper.find(FilterableUsersPopover);

    expect(popover.prop('allGroupUsersLoading')).toEqual(<EuiLoadingContent lines={6} />);
  });
});
