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
<<<<<<< HEAD
import { mount, shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { DeleteRoleButton } from './delete_role_button';

test('it renders without crashing', () => {
  const deleteHandler = jest.fn();
<<<<<<< HEAD
  const wrapper = shallow(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
=======
  const wrapper = shallowWithIntl(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it shows a confirmation dialog when clicked', () => {
  const deleteHandler = jest.fn();
<<<<<<< HEAD
  const wrapper = mount(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
=======
  const wrapper = mountWithIntl(<DeleteRoleButton canDelete={true} onDelete={deleteHandler} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

  wrapper.find(EuiButtonEmpty).simulate('click');

  expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);

  expect(deleteHandler).toHaveBeenCalledTimes(0);
});

test('it renders nothing when canDelete is false', () => {
  const deleteHandler = jest.fn();
<<<<<<< HEAD
  const wrapper = shallow(<DeleteRoleButton canDelete={false} onDelete={deleteHandler} />);
=======
  const wrapper = shallowWithIntl(<DeleteRoleButton canDelete={false} onDelete={deleteHandler} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find('*')).toHaveLength(0);
  expect(deleteHandler).toHaveBeenCalledTimes(0);
});
