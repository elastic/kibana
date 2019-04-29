/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Role } from '../../../../../../../common/model';
import { ClusterPrivileges } from './cluster_privileges';

test('it renders without crashing', () => {
  const role: Role = {
    name: '',
    elasticsearch: {
      cluster: [],
      indices: [],
      run_as: [],
    },
    kibana: [],
  };

  const wrapper = shallow(<ClusterPrivileges role={role} onChange={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});
