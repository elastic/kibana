/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { SpaceAvatarInternal } from './space_avatar_internal';

test('renders without crashing', () => {
  const wrapper = shallow(<SpaceAvatarInternal space={{ name: '', id: '' }} />);
  expect(wrapper).toMatchSnapshot();
});

test('renders with a space name entirely made of whitespace', () => {
  const wrapper = shallow(<SpaceAvatarInternal space={{ name: '      ', id: '' }} />);
  expect(wrapper).toMatchSnapshot();
});

test('removes aria-label when instructed not to announce the space name', () => {
  const wrapper = mount(
    <SpaceAvatarInternal space={{ name: '', id: '' }} announceSpaceName={false} />
  );
  expect(wrapper).toMatchSnapshot();
});
