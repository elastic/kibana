/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { IndexPrivileges } from './index_privileges';
import { IndexPrivilegeForm } from './index_privilege_form';
import { RoleValidator } from '../../lib/validate_role';

test('it renders without crashing', () => {
  const props = {
    role: {
      cluster: [],
      indices: [],
      run_as: []
    },
    httpClient: jest.fn(),
    onChange: jest.fn(),
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = shallow(<IndexPrivileges {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders a IndexPrivilegeForm for each privilege on the role', () => {
  const props = {
    role: {
      cluster: [],
      indices: [{
        names: ['foo*'],
        privileges: ['all'],
        query: '*',
        field_security: {
          grant: ['some_field']
        }
      }],
      run_as: []
    },
    httpClient: jest.fn(),
    onChange: jest.fn(),
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = mount(<IndexPrivileges {...props} />);
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(1);
});