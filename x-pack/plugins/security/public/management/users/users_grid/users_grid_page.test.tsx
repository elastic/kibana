/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import type { ReactWrapper } from 'enzyme';
import type { LocationDescriptorObject } from 'history';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { CoreStart, ScopedHistory } from 'src/core/public';
import { coreMock, scopedHistoryMock } from 'src/core/public/mocks';

import type { User } from '../../../../common/model';
import { rolesAPIClientMock } from '../../roles/index.mock';
import { userAPIClientMock } from '../index.mock';
import { UsersGridPage } from './users_grid_page';

describe('UsersGridPage', () => {
  let history: ScopedHistory;
  let coreStart: CoreStart;

  beforeEach(() => {
    history = scopedHistoryMock.create();
    history.createHref = (location: LocationDescriptorObject) => {
      return `${location.pathname}${location.search ? '?' + location.search : ''}`;
    };
    coreStart = coreMock.createStart();
  });

  it('renders the list of users', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
        },
        {
          username: 'reserved',
          email: 'reserved@bar.net',
          full_name: '',
          roles: ['superuser'],
          enabled: true,
          metadata: {
            _reserved: true,
          },
        },
      ]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    expect(apiClientMock.getUsers).toBeCalledTimes(1);
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(findTestSubject(wrapper, 'userDisabled')).toHaveLength(0);
  });

  it('renders the loading indication on the table when fetching user with data', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
        },
        {
          username: 'reserved',
          email: 'reserved@bar.net',
          full_name: '',
          roles: ['superuser'],
          enabled: true,
          metadata: {
            _reserved: true,
          },
        },
      ]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    expect(wrapper.find('.euiBasicTable-loading').exists()).toBeTruthy();
    await waitForRender(wrapper);
    expect(wrapper.find('.euiBasicTable-loading').exists()).toBeFalsy();
  });

  it('renders the loading indication on the table when fetching user with no data', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    expect(wrapper.find('.euiBasicTable-loading').exists()).toBeTruthy();
    await waitForRender(wrapper);
    expect(wrapper.find('.euiBasicTable-loading').exists()).toBeFalsy();
  });

  it('generates valid links when usernames contain special characters', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'username with some fun characters!@#$%^&*()',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
        },
      ]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    const link = findTestSubject(wrapper, 'userRowUserName');
    expect(link.props().href).toMatchInlineSnapshot(
      `"/edit/username%20with%20some%20fun%20characters!%40%23%24%25%5E%26*()"`
    );
  });

  it('renders a forbidden message if user is not authorized', async () => {
    const apiClient = userAPIClientMock.create();
    apiClient.getUsers.mockRejectedValue({ body: { statusCode: 403 } });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClient}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUsers).toBeCalledTimes(1);
    expect(wrapper.find('[data-test-subj="permissionDeniedMessage"]')).toHaveLength(1);
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(0);
  });

  it('renders disabled users', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: false,
        },
      ]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    expect(findTestSubject(wrapper, 'userDisabled')).toHaveLength(1);
  });

  it('renders deprecated users', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
          metadata: {
            _reserved: true,
            _deprecated: true,
            _deprecated_reason: 'This user is not cool anymore.',
          },
        },
      ]);
    });

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    expect(findTestSubject(wrapper, 'userDeprecated')).toHaveLength(1);
  });

  it('renders a warning when a user is assigned a deprecated role', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
        },
        {
          username: 'reserved',
          email: 'reserved@bar.net',
          full_name: '',
          roles: ['superuser'],
          enabled: true,
          metadata: {
            _reserved: true,
          },
        },
      ]);
    });

    const roleAPIClientMock = rolesAPIClientMock.create();
    roleAPIClientMock.getRoles.mockResolvedValue([
      {
        name: 'kibana_user',
        metadata: {
          _deprecated: true,
          _deprecated_reason: `I don't like you.`,
        },
      },
    ]);

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={roleAPIClientMock}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    const deprecationTooltip = wrapper
      .find('[data-test-subj="roleDeprecationTooltip"]')
      .prop('content');

    expect(deprecationTooltip).toMatchInlineSnapshot(
      `"The kibana_user role is deprecated. I don't like you."`
    );
  });

  it('hides reserved users when instructed to', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockImplementation(() => {
      return Promise.resolve<User[]>([
        {
          username: 'foo',
          email: 'foo@bar.net',
          full_name: 'foo bar',
          roles: ['kibana_user'],
          enabled: true,
        },
        {
          username: 'reserved',
          email: 'reserved@bar.net',
          full_name: '',
          roles: ['superuser'],
          enabled: true,
          metadata: {
            _reserved: true,
          },
        },
      ]);
    });

    const roleAPIClientMock = rolesAPIClientMock.create();

    const wrapper = mountWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={roleAPIClientMock}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitForRender(wrapper);

    expect(wrapper.find(EuiBasicTable).props().items).toEqual([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
      {
        username: 'reserved',
        email: 'reserved@bar.net',
        full_name: '',
        roles: ['superuser'],
        enabled: true,
        metadata: {
          _reserved: true,
        },
      },
    ]);

    findTestSubject(wrapper, 'showReservedUsersSwitch').simulate('click');

    expect(wrapper.find(EuiBasicTable).props().items).toEqual([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
    ]);
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await nextTick();
  wrapper.update();
}
