/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { SpaceCard } from './space_card';
import { EuiCard } from '@elastic/eui';

test('it renders without crashing', () => {
  const space = {
    id: '',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  shallow(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
});

test('links to the indicated space', () => {
  const space = {
    id: 'some-space',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  const wrapper = mount(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
  expect(wrapper.find(EuiCard).props()).toMatchObject({
    href: '/server-base-path/s/some-space/spaces/enter',
  });
});

test('links to the default space too', () => {
  const space = {
    id: 'default',
    name: 'default space',
    description: 'space description',
    disabledFeatures: [],
  };

  const wrapper = mount(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
  expect(wrapper.find(EuiCard).props()).toMatchObject({
    href: '/server-base-path/spaces/enter',
  });
});
