/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonIcon, EuiConfirmModal } from '@elastic/eui';

import {
  REMOVE_ROLE_MAPPING_TITLE,
  REMOVE_ROLE_MAPPING_BUTTON,
  ROLE_MODAL_TEXT,
} from './constants';

import { UsersAndRolesRowActions } from './users_and_roles_row_actions';

describe('UsersAndRolesRowActions', () => {
  const onManageClick = jest.fn();
  const onDeleteClick = jest.fn();
  const username = 'foo';

  const props = {
    username,
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
    wrapper.find(EuiConfirmModal).prop('onConfirm')!({} as any);

    expect(onDeleteClick).toHaveBeenCalled();
  });

  it('renders role mapping confirm modal text', () => {
    const wrapper = shallow(<UsersAndRolesRowActions {...props} username={undefined} />);
    const button = wrapper.find(EuiButtonIcon).last();
    button.simulate('click');
    const modal = wrapper.find(EuiConfirmModal);

    expect(modal.prop('title')).toEqual(REMOVE_ROLE_MAPPING_TITLE);
    expect(modal.prop('children')).toEqual(<p>{ROLE_MODAL_TEXT}</p>);
    expect(modal.prop('confirmButtonText')).toEqual(REMOVE_ROLE_MAPPING_BUTTON);
  });
});
