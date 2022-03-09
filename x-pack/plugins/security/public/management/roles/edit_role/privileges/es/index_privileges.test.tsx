/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from 'src/core/public/mocks';

import { KibanaContextProvider } from '../../../../../../../../../src/plugins/kibana_react/public';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';
import { IndexPrivileges } from './index_privileges';

// the IndexPrivileges post-mount hook kicks off some promises;
// we need to wait for those promises to resolve to ensure any errors are properly caught
const flushPromises = () => new Promise(setImmediate);

test('it renders without crashing', async () => {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const props = {
    role: {
      name: '',
      kibana: [],
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
    },
    onChange: jest.fn(),
    indexPatterns: [],
    editable: true,
    validator: new RoleValidator(),
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    indicesAPIClient: indicesAPIClientMock.create(),
    license,
  };
  const wrapper = shallowWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <IndexPrivileges {...props} />
    </KibanaContextProvider>
  );
  await flushPromises();
  expect(wrapper.children()).toMatchSnapshot();
});

test('it renders a IndexPrivilegeForm for each privilege on the role', async () => {
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
    editable: true,
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
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(1);
});
