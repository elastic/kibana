/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiColorPicker, EuiFieldText, EuiLink } from '@elastic/eui';
<<<<<<< HEAD
import { mount, shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { CustomizeSpaceAvatar } from './customize_space_avatar';

const space = {
  id: '',
  name: '',
};

test('renders without crashing', () => {
<<<<<<< HEAD
  const wrapper = shallow(<CustomizeSpaceAvatar space={space} onChange={jest.fn()} />);
=======
  const wrapper = shallowWithIntl(
    <CustomizeSpaceAvatar.WrappedComponent space={space} onChange={jest.fn()} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper).toMatchSnapshot();
});

test('renders a "customize" link by default', () => {
<<<<<<< HEAD
  const wrapper = mount(<CustomizeSpaceAvatar space={space} onChange={jest.fn()} />);
=======
  const wrapper = mountWithIntl(
    <CustomizeSpaceAvatar.WrappedComponent space={space} onChange={jest.fn()} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find(EuiLink)).toHaveLength(1);
});

test('shows customization fields when the "customize" link is clicked', () => {
<<<<<<< HEAD
  const wrapper = mount(<CustomizeSpaceAvatar space={space} onChange={jest.fn()} />);
=======
  const wrapper = mountWithIntl(
    <CustomizeSpaceAvatar.WrappedComponent space={space} onChange={jest.fn()} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  wrapper.find(EuiLink).simulate('click');

  expect(wrapper.find(EuiLink)).toHaveLength(0);
  expect(wrapper.find(EuiFieldText)).toHaveLength(1);
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

<<<<<<< HEAD
  const wrapper = mount(<CustomizeSpaceAvatar space={customizedSpace} onChange={changeHandler} />);
=======
  const wrapper = mountWithIntl(
    <CustomizeSpaceAvatar.WrappedComponent
      space={customizedSpace}
      onChange={changeHandler}
      intl={null as any}
    />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  wrapper.find(EuiLink).simulate('click');

  wrapper
    .find(EuiFieldText)
    .find('input')
    .simulate('change', { target: { value: 'NV' } });

  expect(changeHandler).toHaveBeenCalledWith({
    ...customizedSpace,
    initials: 'NV',
  });
});
