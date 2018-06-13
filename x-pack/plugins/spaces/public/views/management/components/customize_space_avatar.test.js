/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { CustomizeSpaceAvatar } from './customize_space_avatar';

test('renders without crashing', () => {
  const wrapper = shallow(<CustomizeSpaceAvatar space={{}} onChange={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});
