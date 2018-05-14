/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBadge
} from '@elastic/eui';
import { ReservedRoleBadge } from './reserved_role_badge';
import {
  shallow
} from 'enzyme';

const reservedRole = {
  metadata: {
    _reserved: true
  }
};

const unreservedRole = {};

test('it renders without crashing', () => {
  const wrapper = shallow(<ReservedRoleBadge role={reservedRole} />);
  expect(wrapper.find(EuiBadge)).toHaveLength(1);
});

test('it renders nothing for an unreserved role', () => {
  const wrapper = shallow(<ReservedRoleBadge role={unreservedRole} />);
  expect(wrapper.find('*')).toHaveLength(0);
});
