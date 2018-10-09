/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SpaceAvatar } from './space_avatar';

test('renders without crashing', () => {
  const wrapper = shallow(<SpaceAvatar space={{ name: '', id: '' }} />);
  expect(wrapper).toMatchSnapshot();
});

test('renders with a space name entirely made of whitespace', () => {
  const wrapper = shallow(<SpaceAvatar space={{ name: '      ', id: '' }} />);
  expect(wrapper).toMatchSnapshot();
});
