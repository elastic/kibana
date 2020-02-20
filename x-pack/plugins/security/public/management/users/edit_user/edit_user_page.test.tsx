/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { EditUserPage } from './edit_user_page';
import React from 'react';
import { User, Role } from '../../../../common/model';
import { ReactWrapper } from 'enzyme';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { mockAuthenticatedUser } from '../../../../common/model/authenticated_user.mock';
import { securityMock } from '../../../mocks';
import { rolesAPIClientMock } from '../../roles/index.mock';
import { userAPIClientMock } from '../index.mock';

const createUser = (username: string) => {
  const user: User = {
    username,
    full_name: 'my full name',
    email: 'foo@bar.com',
    roles: ['idk', 'something'],
    enabled: true,
  };

  if (username === 'reserved_user') {
    user.metadata = {
      _reserved: true,
    };
  }

  return user;
};

const buildClients = () => {
  const apiClient = userAPIClientMock.create();
  apiClient.getUser.mockImplementation(async (username: string) => createUser(username));

  const rolesAPIClient = rolesAPIClientMock.create();
  rolesAPIClient.getRoles.mockImplementation(() => {
    return Promise.resolve([
      {
        name: 'role 1',
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: [],
        },
        kibana: [],
      },
      {
        name: 'role 2',
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: ['bar'],
        },
        kibana: [],
      },
    ] as Role[]);
  });

  return { apiClient, rolesAPIClient };
};

function buildSecuritySetup() {
  const securitySetupMock = securityMock.createSetup();
  securitySetupMock.authc.getCurrentUser.mockResolvedValue(
    mockAuthenticatedUser(createUser('current_user'))
  );
  return securitySetupMock;
}

function expectSaveButton(wrapper: ReactWrapper<any, any>) {
  expect(wrapper.find('EuiButton[data-test-subj="userFormSaveButton"]')).toHaveLength(1);
}

function expectMissingSaveButton(wrapper: ReactWrapper<any, any>) {
  expect(wrapper.find('EuiButton[data-test-subj="userFormSaveButton"]')).toHaveLength(0);
}

describe('EditUserPage', () => {
  it('allows reserved users to be viewed', async () => {
    const { apiClient, rolesAPIClient } = buildClients();
    const securitySetup = buildSecuritySetup();
    const wrapper = mountWithIntl(
      <EditUserPage
        username={'reserved_user'}
        apiClient={apiClient}
        rolesAPIClient={rolesAPIClient}
        authc={securitySetup.authc}
        notifications={coreMock.createStart().notifications}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(1);
    expect(securitySetup.authc.getCurrentUser).toBeCalledTimes(1);

    expectMissingSaveButton(wrapper);
  });

  it('allows new users to be created', async () => {
    const { apiClient, rolesAPIClient } = buildClients();
    const securitySetup = buildSecuritySetup();
    const wrapper = mountWithIntl(
      <EditUserPage
        username={''}
        apiClient={apiClient}
        rolesAPIClient={rolesAPIClient}
        authc={securitySetup.authc}
        notifications={coreMock.createStart().notifications}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(0);
    expect(securitySetup.authc.getCurrentUser).toBeCalledTimes(0);

    expectSaveButton(wrapper);
  });

  it('allows existing users to be edited', async () => {
    const { apiClient, rolesAPIClient } = buildClients();
    const securitySetup = buildSecuritySetup();
    const wrapper = mountWithIntl(
      <EditUserPage
        username={'existing_user'}
        apiClient={apiClient}
        rolesAPIClient={rolesAPIClient}
        authc={securitySetup.authc}
        notifications={coreMock.createStart().notifications}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUser).toBeCalledTimes(1);
    expect(securitySetup.authc.getCurrentUser).toBeCalledTimes(1);

    expectSaveButton(wrapper);
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await act(async () => {
    await nextTick();
    wrapper.update();
  });
}
