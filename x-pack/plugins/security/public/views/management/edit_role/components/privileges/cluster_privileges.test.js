/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { ClusterPrivileges } from './cluster_privileges';
import { EuiCheckboxGroup } from '@elastic/eui';

test('it renders without crashing', () => {
  const wrapper = shallow(<ClusterPrivileges role={{}} onChange={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders 2 checkbox groups of privileges', () => {
  const wrapper = mount(<ClusterPrivileges role={{}} onChange={jest.fn()} />);
  expect(wrapper.find(EuiCheckboxGroup)).toHaveLength(2);
});
