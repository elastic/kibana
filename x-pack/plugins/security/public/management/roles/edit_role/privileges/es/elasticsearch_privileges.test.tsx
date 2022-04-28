/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';
import { ClusterPrivileges } from './cluster_privileges';
import { ElasticsearchPrivileges } from './elasticsearch_privileges';
import { IndexPrivileges } from './index_privileges';

function getProps() {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const { docLinks } = coreMock.createStart();

  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    validator: new RoleValidator(),
    builtinESPrivileges: {
      cluster: ['all', 'manage', 'monitor'],
      index: ['all', 'read', 'write', 'index'],
    },
    indicesAPIClient: indicesAPIClientMock.create(),
    docLinks,
    license,
  };
}

test('it renders without crashing', () => {
  expect(shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />)).toMatchSnapshot();
});

test('it renders ClusterPrivileges', () => {
  expect(
    mountWithIntl(<ElasticsearchPrivileges {...getProps()} />).find(ClusterPrivileges)
  ).toHaveLength(1);
});

test('it renders IndexPrivileges', () => {
  expect(
    mountWithIntl(<ElasticsearchPrivileges {...getProps()} />).find(IndexPrivileges)
  ).toHaveLength(1);
});
