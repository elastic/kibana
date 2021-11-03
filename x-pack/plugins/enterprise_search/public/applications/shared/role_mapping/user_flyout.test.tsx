/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout, EuiText, EuiIcon } from '@elastic/eui';

import {
  USERS_HEADING_LABEL,
  UPDATE_USER_LABEL,
  USER_UPDATED_LABEL,
  NEW_USER_DESCRIPTION,
  UPDATE_USER_DESCRIPTION,
} from './constants';

import { UserFlyout } from './';

describe('UserFlyout', () => {
  const closeUserFlyout = jest.fn();
  const handleSaveUser = jest.fn();

  const props = {
    children: <div />,
    isNew: true,
    isComplete: false,
    disabled: false,
    formLoading: false,
    closeUserFlyout,
    handleSaveUser,
  };

  it('renders for new user', () => {
    const wrapper = shallow(<UserFlyout {...props} />);

    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
    expect(wrapper.find('h2').prop('children')).toEqual(USERS_HEADING_LABEL);
    expect(wrapper.find(EuiText).prop('children')).toEqual(<p>{NEW_USER_DESCRIPTION}</p>);
  });

  it('renders for existing user', () => {
    const wrapper = shallow(<UserFlyout {...props} isNew={false} />);

    expect(wrapper.find('h2').prop('children')).toEqual(UPDATE_USER_LABEL);
    expect(wrapper.find(EuiText).prop('children')).toEqual(<p>{UPDATE_USER_DESCRIPTION}</p>);
  });

  it('renders icon and message for completed user', () => {
    const wrapper = shallow(<UserFlyout {...props} isNew={false} isComplete />);
    const icon = (
      <EuiIcon
        color="success"
        size="l"
        type="checkInCircleFilled"
        style={{ marginLeft: 5, marginTop: -5 }}
      />
    );
    const children = (
      <span>
        {USER_UPDATED_LABEL} {icon}
      </span>
    );

    expect(wrapper.find('h2').prop('children')).toEqual(children);
  });
});
