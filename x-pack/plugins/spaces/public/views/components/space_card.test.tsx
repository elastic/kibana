/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { SpaceCard } from './space_card';

test('it renders without crashing', () => {
  const space = {
    id: '',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  shallow(<SpaceCard space={space} onClick={jest.fn()} />);
});

test('it is clickable', () => {
  const space = {
    id: '',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  const clickHandler = jest.fn();

  const wrapper = mount(<SpaceCard space={space} onClick={clickHandler} />);
  wrapper.simulate('click');

  expect(clickHandler).toHaveBeenCalledTimes(1);
});
