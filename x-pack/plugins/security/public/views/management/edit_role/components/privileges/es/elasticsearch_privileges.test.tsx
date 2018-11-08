/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
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
  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
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
  const wrapper = mountWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
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
  const wrapper = mountWithIntl(
    <ElasticsearchPrivileges.WrappedComponent {...props} intl={null as any} />
  );
  expect(wrapper.find(IndexPrivileges)).toHaveLength(1);
});
