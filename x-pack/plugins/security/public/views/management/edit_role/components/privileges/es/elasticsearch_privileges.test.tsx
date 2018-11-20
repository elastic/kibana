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
import { ClusterPrivileges } from './cluster_privileges';
import { ElasticsearchPrivileges } from './elasticsearch_privileges';
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
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
<<<<<<< HEAD
  const wrapper = shallow(<ElasticsearchPrivileges {...props} />);
=======
  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper).toMatchSnapshot();
});

test('it renders ClusterPrivileges', () => {
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
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
<<<<<<< HEAD
  const wrapper = mount(<ElasticsearchPrivileges {...props} />);
=======
  const wrapper = mountWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find(ClusterPrivileges)).toHaveLength(1);
});

test('it renders IndexPrivileges', () => {
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
    editable: true,
    httpClient: jest.fn(),
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
  };
<<<<<<< HEAD
  const wrapper = mount(<ElasticsearchPrivileges {...props} />);
=======
  const wrapper = mountWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper.find(IndexPrivileges)).toHaveLength(1);
});
