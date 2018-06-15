/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { EuiLink, EuiFieldText, EuiColorPicker } from '@elastic/eui';

test('renders without crashing', () => {
  const wrapper = shallow(<CustomizeSpaceAvatar space={{}} onChange={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});

test('renders a "customize" link by default', () => {
  const wrapper = mount(<CustomizeSpaceAvatar space={{}} onChange={jest.fn()} />);
  expect(wrapper.find(EuiLink)).toHaveLength(1);
});

test('shows customization fields when the "customize" link is clicked', () => {
  const wrapper = mount(<CustomizeSpaceAvatar space={{}} onChange={jest.fn()} />);
  wrapper.find(EuiLink).simulate('click');

  expect(wrapper.find(EuiLink)).toHaveLength(0);
  expect(wrapper.find(EuiFieldText)).toHaveLength(1);
  expect(wrapper.find(EuiColorPicker)).toHaveLength(1);
});

test('invokes onChange callback when avatar is customized', () => {
  const space = {
    name: "Unit Test Space",
    initials: "SP",
    color: "#ABCDEF"
  };

  const changeHandler = jest.fn();

  const wrapper = mount(<CustomizeSpaceAvatar space={space} onChange={changeHandler} />);
  wrapper.find(EuiLink).simulate('click');

  wrapper.find(EuiFieldText).find('input').simulate('change', { target: { value: 'NV' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...space,
    initials: 'NV'
  });
});