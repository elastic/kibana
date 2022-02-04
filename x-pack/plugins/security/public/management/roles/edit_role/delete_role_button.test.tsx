/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiConfirmModal } from '@elastic/eui';
import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { DeleteRoleButton } from './delete_role_button';

test('it renders without crashing', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallowWithIntl(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
  expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it shows a confirmation dialog when clicked', () => {
  const deleteHandler = jest.fn();
  const wrapper = mountWithIntl(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);

  wrapper.find(EuiButtonEmpty).simulate('click');

  expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);

  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it renders nothing when canDelete is false', () => {
  const deleteHandler = jest.fn();
  const wrapper = shallowWithIntl(<DeleteRoleButton canDelete={false} onDelete={deleteHandler} />);
  expect(wrapper.find('*')).toHaveLength(0);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});
