/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiColorPicker, EuiFieldText, EuiLink } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { CustomizeSpaceAvatar } from './customize_space_avatar';

const space = {
  id: '',
  name: '',
};

test('renders without crashing', () => {
  const wrapper = shallowWithIntl(<CustomizeSpaceAvatar space={space} onChange={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});

test('shows customization fields', () => {
  const wrapper = mountWithIntl(<CustomizeSpaceAvatar space={space} onChange={jest.fn()} />);

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
    <CustomizeSpaceAvatar space={customizedSpace} onChange={changeHandler} />
  );

  wrapper
    .find(EuiFieldText)
    .first()
    .find('input')
    .simulate('change', { target: { value: 'NV' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...customizedSpace,
    initials: 'NV',
  });
});
