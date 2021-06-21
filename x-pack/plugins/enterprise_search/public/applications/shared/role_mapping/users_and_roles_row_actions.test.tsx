/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonIcon } from '@elastic/eui';

import { UsersAndRolesRowActions } from './users_and_roles_row_actions';

describe('UsersAndRolesRowActions', () => {
  const onManageClick = jest.fn();
  const onDeleteClick = jest.fn();

  const props = {
    onManageClick,
    onDeleteClick,
  };

  it('renders', () => {
    const wrapper = shallow(<UsersAndRolesRowActions {...props} />);

    expect(wrapper.find(EuiButtonIcon)).toHaveLength(2);
  });

  it('handles manage click', () => {
    const wrapper = shallow(<UsersAndRolesRowActions {...props} />);
    const button = wrapper.find(EuiButtonIcon).first();
    button.simulate('click');

    expect(onManageClick).toHaveBeenCalled();
  });

  it('handles delete click', () => {
    const wrapper = shallow(<UsersAndRolesRowActions {...props} />);
    const button = wrapper.find(EuiButtonIcon).last();
    button.simulate('click');

    expect(onDeleteClick).toHaveBeenCalled();
  });
});
