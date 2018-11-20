/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { mount, shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
      kibana: {
        global: [],
        space: {},
      },
    },
    httpClient: jest.fn(),
    onChange: jest.fn(),
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
<<<<<<< HEAD
  const wrapper = shallow(<IndexPrivileges {...props} />);
=======
  const wrapper = shallowWithIntl(<IndexPrivileges {...props} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper).toMatchSnapshot();
});

test('it renders a IndexPrivilegeForm for each privilege on the role', () => {
  const props = {
    role: {
      name: '',
      kibana: {
        global: [],
        space: {},
      },
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
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
<<<<<<< HEAD
  const wrapper = mount(<IndexPrivileges {...props} />);
=======
  const wrapper = mountWithIntl(<IndexPrivileges {...props} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(1);
});
