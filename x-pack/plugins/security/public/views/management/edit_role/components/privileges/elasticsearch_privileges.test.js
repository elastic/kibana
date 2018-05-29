/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { IndexPrivileges } from './index_privileges';
import { ClusterPrivileges } from './cluster_privileges';
import { ElasticsearchPrivileges } from './elasticsearch_privileges';
import { RoleValidator } from '../../lib/validate_role';

test('it renders without crashing', () => {
  const props = {
    role: {
      cluster: [],
      indices: [],
      run_as: []
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = shallow(<ElasticsearchPrivileges {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders ClusterPrivileges', () => {
  const props = {
    role: {
      cluster: [],
      indices: [],
      run_as: []
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = mount(<ElasticsearchPrivileges {...props} />);
  expect(wrapper.find(ClusterPrivileges)).toHaveLength(1);
});

test('it renders IndexPrivileges', () => {
  const props = {
    role: {
      cluster: [],
      indices: [],
      run_as: []
    },
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = mount(<ElasticsearchPrivileges {...props} />);
  expect(wrapper.find(IndexPrivileges)).toHaveLength(1);
});