/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { ElasticsearchPrivileges } from './elasticsearch_privileges';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';

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
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('ClusterPrivileges')).toHaveLength(1);
});

test('it renders index privileges section', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('IndexPrivileges[indexType="indices"]')).toHaveLength(1);
});

test('it does not render remote index privileges section by default', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('IndexPrivileges[indexType="remote_indices"]')).toHaveLength(0);
});

test('it renders remote index privileges section when `canUseRemoteIndices` is enabled', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} canUseRemoteIndices />);
  expect(wrapper.find('IndexPrivileges[indexType="remote_indices"]')).toHaveLength(1);
});

test('it renders fields as disabled when not editable', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} editable={false} />);
  expect(wrapper.find('EuiComboBox').prop('isDisabled')).toBe(true);
  expect(wrapper.find('ClusterPrivileges').prop('editable')).toBe(false);
  expect(
    wrapper.find('IndexPrivileges').everyWhere((component) => component.prop('editable'))
  ).toBe(false);
});
