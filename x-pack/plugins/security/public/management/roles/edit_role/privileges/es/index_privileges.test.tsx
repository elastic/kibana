/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { RoleValidator } from '../../validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';
import { IndexPrivileges } from './index_privileges';

import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';

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
  const wrapper = shallowWithIntl(<IndexPrivileges {...props} />);
  await flushPromises();
  expect(wrapper).toMatchSnapshot();
});

test('it renders a IndexPrivilegeForm for each privilege on the role', async () => {
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
    indicesAPIClient: indicesAPIClientMock.create(),
    license,
  };
  const wrapper = mountWithIntl(<IndexPrivileges {...props} />);
  await flushPromises();
  expect(wrapper.find(IndexPrivilegeForm)).toHaveLength(1);
});
