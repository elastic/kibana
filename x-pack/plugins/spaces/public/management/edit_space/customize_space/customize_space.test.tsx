/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { SpaceValidator } from '../../lib';
import { CustomizeSpace } from './customize_space';

const validator = new SpaceValidator({ shouldValidate: true });

test('renders correctly', () => {
  const wrapper = shallowWithIntl(
    <CustomizeSpace
      space={{
        id: '',
        name: '',
      }}
      editingExistingSpace={false}
      validator={validator}
      onChange={jest.fn()}
    />
  );
  expect(wrapper).toMatchSnapshot();
});

test('updates identifier, initials and color when name is changed', () => {
  const space = {
    id: 'space-1',
    name: 'Space 1',
    initials: 'S1',
    color: '#ABCDEF',
  };
  const changeHandler = jest.fn();

  const wrapper = mountWithIntl(
    <CustomizeSpace
      space={space}
      editingExistingSpace={false}
      validator={validator}
      onChange={changeHandler}
    />
  );

  wrapper.find('input[name="name"]').simulate('change', { target: { value: 'Space 2' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...space,
    id: 'space-2',
    name: 'Space 2',
    initials: 'S2',
    color: '#9170B8',
  });
});

test('does not update custom identifier, initials or color name is changed', () => {
  const space = {
    id: 'space-1',
    name: 'Space 1',
    initials: 'S1',
    color: '#ABCDEF',
    customAvatarInitials: true,
    customAvatarColor: true,
  };
  const changeHandler = jest.fn();

  const wrapper = mountWithIntl(
    <CustomizeSpace
      space={space}
      editingExistingSpace={true}
      validator={validator}
      onChange={changeHandler}
    />
  );

  wrapper.find('input[name="name"]').simulate('change', { target: { value: 'Space 2' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...space,
    name: 'Space 2',
  });
});
