/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  // @ts-ignore
  EuiConfirmModal,
} from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { DeleteRoleButton } from './delete_role_button';

test('it renders without crashing', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallow(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
  expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it shows a confirmation dialog when clicked', () => {
  const deleteHandler = jest.fn();
  const wrapper = mount(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);

  wrapper.find(EuiButtonEmpty).simulate('click');

  expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);

  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it renders nothing when canDelete is false', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallow(<DeleteRoleButton canDelete={false} onDelete={deleteHandler} />);
  expect(wrapper.find('*')).toHaveLength(0);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});
