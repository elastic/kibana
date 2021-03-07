/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  within,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { securityMock } from '../../../mocks';
import { Providers } from '../api_keys_management_app';
import { APIKeysGridPage } from './api_keys_grid_page';
import { apiKeysAPIClientMock } from '../index.mock';
import { mockAuthenticatedUser } from '../../../../common/model/authenticated_user.mock';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const coreStart = coreMock.createStart();

const apiClientMock = apiKeysAPIClientMock.create();
apiClientMock.checkPrivileges.mockResolvedValue({
  areApiKeysEnabled: true,
  canManage: true,
  isAdmin: true,
});
apiClientMock.getApiKeys.mockResolvedValue({
  apiKeys: [
    {
      creation: 1571322182082,
      expiration: 1571408582082,
      id: '0QQZ2m0BO2XZwgJFuWTT',
      invalidated: false,
      name: 'my-api-key',
      realm: 'reserved',
      username: 'elastic',
    },
  ],
});

const authc = securityMock.createSetup().authc;
authc.getCurrentUser.mockResolvedValue(
  mockAuthenticatedUser({
    username: 'jdoe',
    full_name: '',
    email: '',
    enabled: true,
    roles: ['superuser'],
  })
);

describe('APIKeysGridPage', () => {
  it('loads and displays API keys', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { getByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    await waitForElementToBeRemoved(() => getByText(/Loading API keys/));
    getByText(/my-api-key/);
  });

  it('displays callout when API keys are disabled', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    apiClientMock.checkPrivileges.mockResolvedValueOnce({
      areApiKeysEnabled: false,
      canManage: true,
      isAdmin: true,
    });

    const { getByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    await waitForElementToBeRemoved(() => getByText(/Loading API keys/));
    getByText(/API keys not enabled/);
  });

  it('displays error when user does not have required permissions', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    apiClientMock.checkPrivileges.mockResolvedValueOnce({
      areApiKeysEnabled: true,
      canManage: false,
      isAdmin: false,
    });

    const { getByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    await waitForElementToBeRemoved(() => getByText(/Loading API keys/));
    getByText(/You need permission to manage API keys/);
  });

  it('displays error when fetching API keys fails', async () => {
    apiClientMock.getApiKeys.mockRejectedValueOnce({
      body: { error: 'Internal Server Error', message: '', statusCode: 500 },
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { getByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    await waitForElementToBeRemoved(() => getByText(/Loading API keys/));
    getByText(/Could not load API keys/);
  });

  it('creates API key when submitting form, redirects back and displays base64', async () => {
    const history = createMemoryHistory({ initialEntries: ['/create'] });
    coreStart.http.get.mockResolvedValue([{ name: 'superuser' }]);
    coreStart.http.post.mockResolvedValue({ id: '1D', api_key: 'AP1_K3Y' });

    const { findByRole, findByDisplayValue } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );
    expect(coreStart.http.get).toHaveBeenCalledWith('/api/security/role');

    const dialog = await findByRole('dialog');

    fireEvent.click(await findByRole('button', { name: 'Create API key' }));

    const alert = await findByRole('alert');
    within(alert).getByText(/Enter a name/i);

    fireEvent.change(await within(dialog).findByLabelText('Name'), {
      target: { value: 'Test' },
    });

    fireEvent.click(await findByRole('button', { name: 'Create API key' }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/api_key', {
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(history.location.pathname).toBe('/');
    });

    await findByDisplayValue(btoa('1D:AP1_K3Y'));
  });
});
