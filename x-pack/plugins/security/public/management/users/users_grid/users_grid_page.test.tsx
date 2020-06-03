/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LocationDescriptorObject } from 'history';
import { CoreStart, ScopedHistory } from 'kibana/public';

import { User } from '../../../../common/model';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { UsersGridPage } from './users_grid_page';
import React from 'react';
import { ReactWrapper } from 'enzyme';
import { userAPIClientMock } from '../index.mock';
import { coreMock, scopedHistoryMock } from '../../../../../../../src/core/public/mocks';
import { rolesAPIClientMock } from '../../roles/index.mock';
import { findTestSubject } from 'test_utils/find_test_subject';
import { EuiBasicTable } from '@elastic/eui';

describe('UsersGridPage', () => {
  let history: ScopedHistory;
  let coreStart: CoreStart;

  beforeEach(() => {
    history = (scopedHistoryMock.create() as unknown) as ScopedHistory;
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

    const deprecationTooltip = wrapper.find('[data-test-subj="roleDeprecationTooltip"]').props();

    expect(deprecationTooltip).toMatchInlineSnapshot(`
      Object {
        "children": <div>
          kibana_user
           
          <EuiIcon
            className="eui-alignTop"
            color="warning"
            size="s"
            type="alert"
          />
        </div>,
        "content": "The kibana_user role is deprecated. I don't like you.",
        "data-test-subj": "roleDeprecationTooltip",
        "delay": "regular",
        "position": "top",
      }
    `);
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
