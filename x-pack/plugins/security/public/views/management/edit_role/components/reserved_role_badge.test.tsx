/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { shallow } from 'enzyme';
import React from 'react';
import { Role } from '../../../../../common/model';
import { ReservedRoleBadge } from './reserved_role_badge';

const reservedRole: Role = {
  name: '',
  elasticsearch: {
    cluster: [],
    indices: [],
    run_as: [],
  },
  kibana: [
    {
      spaces: ['*'],
      base: ['all'],
      feature: {},
    },
    {
      spaces: ['default'],
      base: ['foo'],
      feature: {},
    },
    {
      spaces: ['marketing'],
      base: ['read'],
      feature: {},
    },
  ],
  metadata: {
    _reserved: true,
  },
};

const unreservedRole = {
  name: '',
  elasticsearch: {
    cluster: [],
    indices: [],
    run_as: [],
  },
  kibana: [
    {
      spaces: ['*'],
      base: ['all'],
      feature: {},
    },
    {
      spaces: ['default'],
      base: ['foo'],
      feature: {},
    },
    {
      spaces: ['marketing'],
      base: ['read'],
      feature: {},
    },
  ],
};

test('it renders without crashing', () => {
  const wrapper = shallow(<ReservedRoleBadge role={reservedRole} />);
  expect(wrapper.find(EuiIcon)).toHaveLength(1);
});

test('it renders nothing for an unreserved role', () => {
  const wrapper = shallow(<ReservedRoleBadge role={unreservedRole} />);
  expect(wrapper.find('*')).toHaveLength(0);
});
