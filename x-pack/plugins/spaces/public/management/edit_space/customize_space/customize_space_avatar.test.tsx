/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPicker, EuiFieldText, EuiLink } from '@elastic/eui';
import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { SpaceValidator } from '../../lib';
import { CustomizeSpaceAvatar } from './customize_space_avatar';

const space = {
  id: '',
  name: '',
};

const validator = new SpaceValidator({ shouldValidate: true });

test('renders without crashing', () => {
  const wrapper = shallowWithIntl(
    <CustomizeSpaceAvatar space={space} validator={validator} onChange={jest.fn()} />
  );
  expect(wrapper).toMatchSnapshot();
});

test('shows customization fields', () => {
  const wrapper = mountWithIntl(
    <CustomizeSpaceAvatar space={space} validator={validator} onChange={jest.fn()} />
  );

  expect(wrapper.find(EuiLink)).toHaveLength(0);
  expect(wrapper.find(EuiFieldText)).toHaveLength(2); // EuiColorPicker contains an EuiFieldText element
  expect(wrapper.find(EuiColorPicker)).toHaveLength(1);
});

test('invokes onChange callback when avatar is customized', () => {
  const customizedSpace = {
    id: '',
    name: 'Unit Test Space',
    initials: 'SP',
    color: '#ABCDEF',
  };

  const changeHandler = jest.fn();

  const wrapper = mountWithIntl(
    <CustomizeSpaceAvatar space={customizedSpace} validator={validator} onChange={changeHandler} />
  );

  wrapper.find('input[name="spaceInitials"]').simulate('change', { target: { value: 'NV' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...customizedSpace,
    initials: 'NV',
    customAvatarInitials: true,
  });
});
