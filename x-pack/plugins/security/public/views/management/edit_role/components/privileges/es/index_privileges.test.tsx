/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { RoleValidator } from '../../../lib/validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';
import { IndexPrivileges } from './index_privileges';

test('it renders without crashing', () => {
  const props = {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    httpClient: jest.fn(),
    onChange: jest.fn(),
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    editable: true,
    validator: new RoleValidator(),
  };
  const wrapper = shallowWithIntl(<IndexPrivileges {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders a IndexPrivilegeForm for each privilege on the role', () => {
  const props = {
    role: {
      name: '',
      kibana: [],
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['foo*'],
            privileges: ['all'],
            query: '*',
            field_security: {
              grant: ['some_field'],
            },
          },
        ],
        run_as: [],
      },
    },
    httpClient: jest.fn(),
    onChange: jest.fn(),
    indexPatterns: [],
    editable: true,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
  const wrapper = mountWithIntl(<IndexPrivileges {...props} />);
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(1);
});
