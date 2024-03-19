/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import '@kbn/code-editor-mock/jest_helper';

import { IndexPrivilegeForm } from './index_privilege_form';
import { IndexPrivileges } from './index_privileges';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';

// the IndexPrivileges post-mount hook kicks off some promises;
// we need to wait for those promises to resolve to ensure any errors are properly caught
const flushPromises = () => new Promise(setImmediate);

test('it renders without crashing', async () => {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const wrapper = shallowWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <IndexPrivileges
        indexType="indices"
        role={{
          name: '',
          kibana: [],
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
        }}
        onChange={jest.fn()}
        indexPatterns={[]}
        editable
        validator={new RoleValidator()}
        availableIndexPrivileges={['all', 'read', 'write', 'index']}
        indicesAPIClient={indicesAPIClientMock.create()}
        license={license}
      />
    </KibanaContextProvider>
  );
  await flushPromises();
  expect(wrapper.children()).toMatchSnapshot();
});

test('it renders an IndexPrivilegeForm for each index privilege on the role', async () => {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const indicesAPIClient = indicesAPIClientMock.create();
  indicesAPIClient.getFields.mockResolvedValue(['foo']);

  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <IndexPrivileges
        indexType="indices"
        role={{
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
              {
                names: ['bar*'],
                privileges: ['all'],
                query: '*',
                field_security: {
                  grant: ['another_field'],
                },
              },
            ],
            run_as: [],
          },
        }}
        onChange={jest.fn()}
        indexPatterns={[]}
        editable
        validator={new RoleValidator()}
        availableIndexPrivileges={['all', 'read', 'write', 'index']}
        indicesAPIClient={indicesAPIClient}
        license={license}
      />
    </KibanaContextProvider>
  );
  await flushPromises();
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(2);
});

test('it renders an IndexPrivilegeForm for each remote index privilege on the role', async () => {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const indicesAPIClient = indicesAPIClientMock.create();
  indicesAPIClient.getFields.mockResolvedValue(['foo']);

  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <IndexPrivileges
        indexType="remote_indices"
        role={{
          name: '',
          kibana: [],
          elasticsearch: {
            cluster: [],
            indices: [],
            remote_indices: [
              {
                clusters: ['foo*'],
                names: ['bar*'],
                privileges: ['all'],
                query: '*',
                field_security: {
                  grant: ['some_field'],
                },
              },
              {
                clusters: ['bar*'],
                names: ['foo*'],
                privileges: ['all'],
                query: '*',
                field_security: {
                  grant: ['another_field'],
                },
              },
            ],
            run_as: [],
          },
        }}
        onChange={jest.fn()}
        indexPatterns={[]}
        editable
        validator={new RoleValidator()}
        availableIndexPrivileges={['all', 'read', 'write', 'index']}
        indicesAPIClient={indicesAPIClient}
        license={license}
      />
    </KibanaContextProvider>
  );
  await flushPromises();
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(2);
});

test('it renders fields as disabled when not editable', async () => {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const indicesAPIClient = indicesAPIClientMock.create();
  indicesAPIClient.getFields.mockResolvedValue(['foo']);

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
    onChange: jest.fn(),
    indexPatterns: [],
    editable: false,
    validator: new RoleValidator(),
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    indicesAPIClient,
    license,
  };
  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <IndexPrivileges {...props} />
    </KibanaContextProvider>
  );
  await flushPromises();
  expect(
    wrapper.find('IndexPrivilegeForm').everyWhere((component) => component.prop('isRoleReadOnly'))
  ).toBe(true);
});
