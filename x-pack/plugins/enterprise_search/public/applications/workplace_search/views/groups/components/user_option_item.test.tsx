/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { users } from '../../../__mocks__/users.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserIcon } from '../../../components/shared/user_icon';

import { UserOptionItem } from './user_option_item';

const user = users[0];

describe('UserOptionItem', () => {
  it('renders', () => {
    const wrapper = shallow(<UserOptionItem user={user} />);

    expect(wrapper.find(UserIcon)).toHaveLength(1);
    expect(wrapper.find(EuiFlexGroup)).toHaveLength(1);
    expect(wrapper.find(EuiFlexItem)).toHaveLength(2);
  });

  it('falls back to email when name not present', () => {
    const wrapper = shallow(<UserOptionItem user={{ ...user, name: null }} />);
    const nameItem = wrapper.find(EuiFlexItem).last();

    expect(nameItem.prop('children')).toEqual(user.email);
  });
});
