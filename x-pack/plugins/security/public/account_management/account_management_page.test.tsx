/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { AuthenticatedUser } from '../../common/model';
import { AccountManagementPage } from './account_management_page';
import { coreMock } from 'src/core/public/mocks';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { securityMock } from '../mocks';
import { userAPIClientMock } from '../management/users/index.mock';

interface Options {
  withFullName?: boolean;
  withEmail?: boolean;
  realm?: string;
}
const createUser = ({ withFullName = true, withEmail = true, realm = 'native' }: Options = {}) => {
  return mockAuthenticatedUser({
    full_name: withFullName ? 'Casey Smith' : '',
    username: 'csmith',
    email: withEmail ? 'csmith@domain.com' : '',
    roles: [],
    authentication_realm: {
      type: realm,
      name: realm,
    },
    lookup_realm: {
      type: realm,
      name: realm,
    },
  });
};

function getSecuritySetupMock({ currentUser }: { currentUser: AuthenticatedUser }) {
  const securitySetupMock = securityMock.createSetup();
  securitySetupMock.authc.getCurrentUser.mockResolvedValue(currentUser);
  return securitySetupMock;
}

describe('<AccountManagementPage>', () => {
  it(`displays users full name, username, and email address`, async () => {
    const user = createUser();
    const wrapper = mountWithIntl(
      <AccountManagementPage
        authc={getSecuritySetupMock({ currentUser: user }).authc}
        notifications={coreMock.createStart().notifications}
        apiClient={userAPIClientMock.create()}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('EuiText[data-test-subj="userDisplayName"]').text()).toEqual(
      user.full_name
    );
    expect(wrapper.find('[data-test-subj="username"]').text()).toEqual(user.username);
    expect(wrapper.find('[data-test-subj="email"]').text()).toEqual(user.email);
  });

  it(`displays username when full_name is not provided`, async () => {
    const user = createUser({ withFullName: false });
    const wrapper = mountWithIntl(
      <AccountManagementPage
        authc={getSecuritySetupMock({ currentUser: user }).authc}
        notifications={coreMock.createStart().notifications}
        apiClient={userAPIClientMock.create()}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('EuiText[data-test-subj="userDisplayName"]').text()).toEqual(user.username);
  });

  it(`displays a placeholder when no email address is provided`, async () => {
    const user = createUser({ withEmail: false });
    const wrapper = mountWithIntl(
      <AccountManagementPage
        authc={getSecuritySetupMock({ currentUser: user }).authc}
        notifications={coreMock.createStart().notifications}
        apiClient={userAPIClientMock.create()}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="email"]').text()).toEqual('no email address');
  });

  it(`displays change password form for users in the native realm`, async () => {
    const user = createUser();
    const wrapper = mountWithIntl(
      <AccountManagementPage
        authc={getSecuritySetupMock({ currentUser: user }).authc}
        notifications={coreMock.createStart().notifications}
        apiClient={userAPIClientMock.create()}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('EuiFieldText[data-test-subj="currentPassword"]')).toHaveLength(1);
    expect(wrapper.find('EuiFieldText[data-test-subj="newPassword"]')).toHaveLength(1);
  });

  it(`does not display change password form for users in the saml realm`, async () => {
    const user = createUser({ realm: 'saml' });
    const wrapper = mountWithIntl(
      <AccountManagementPage
        authc={getSecuritySetupMock({ currentUser: user }).authc}
        notifications={coreMock.createStart().notifications}
        apiClient={userAPIClientMock.create()}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('EuiFieldText[data-test-subj="currentPassword"]')).toHaveLength(0);
    expect(wrapper.find('EuiFieldText[data-test-subj="newPassword"]')).toHaveLength(0);
  });
});
