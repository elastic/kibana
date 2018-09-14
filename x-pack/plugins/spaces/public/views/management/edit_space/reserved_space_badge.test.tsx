/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { shallow } from 'enzyme';
import React from 'react';
import { ReservedSpaceBadge } from './reserved_space_badge';

const reservedSpace = {
  id: '',
  name: '',
  _reserved: true,
};

const unreservedSpace = {
  id: '',
  name: '',
};

test('it renders without crashing', () => {
  const wrapper = shallow(<ReservedSpaceBadge space={reservedSpace} />);
  expect(wrapper.find(EuiIcon)).toHaveLength(1);
});

test('it renders nothing for an unreserved space', () => {
  const wrapper = shallow(<ReservedSpaceBadge space={unreservedSpace} />);
  expect(wrapper.find('*')).toHaveLength(0);
});
