/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { SpaceCards } from './space_cards';
import { EuiFlexGroup } from '@elastic/eui';
import { SpaceCard } from './space_card';

test('it renders without crashing', () => {
  const space = {
    id: 'space-id',
    name: 'space name',
    description: 'space description'
  };

  shallow(<SpaceCards spaces={[space]} />);
});

test('it renders spaces in groups of 3', () => {
  function buildSpace(name) {
    return {
      id: `id-${name}`,
      name,
      description: `desc-${name}`
    };
  }

  const spaces = [
    buildSpace(1),
    buildSpace(2),
    buildSpace(3),
    buildSpace(4)
  ];

  const wrapper = mount(<SpaceCards spaces={spaces} />);

  const groups = wrapper.find(EuiFlexGroup);
  expect(groups).toHaveLength(2);

  expect(groups.at(0).find(SpaceCard)).toHaveLength(3);
  expect(groups.at(1).find(SpaceCard)).toHaveLength(1);
});
