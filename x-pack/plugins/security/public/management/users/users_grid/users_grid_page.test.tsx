/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../../../../common/model';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { UsersGridPage } from './users_grid_page';
import React from 'react';
import { ReactWrapper } from 'enzyme';
import { userAPIClientMock } from '../index.mock';
import { coreMock } from '../../../../../../../src/core/public/mocks';

describe('UsersGridPage', () => {
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
        apiClient={apiClientMock}
        notifications={coreMock.createStart().notifications}
      />
    );

    await waitForRender(wrapper);

    expect(apiClientMock.getUsers).toBeCalledTimes(1);
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
  });

  it('renders a forbidden message if user is not authorized', async () => {
    const apiClient = userAPIClientMock.create();
    apiClient.getUsers.mockRejectedValue({ body: { statusCode: 403 } });

    const wrapper = mountWithIntl(
      <UsersGridPage apiClient={apiClient} notifications={coreMock.createStart().notifications} />
    );

    await waitForRender(wrapper);

    expect(apiClient.getUsers).toBeCalledTimes(1);
    expect(wrapper.find('[data-test-subj="permissionDeniedMessage"]')).toHaveLength(1);
    expect(wrapper.find('EuiInMemoryTable')).toHaveLength(0);
  });
});

async function waitForRender(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
