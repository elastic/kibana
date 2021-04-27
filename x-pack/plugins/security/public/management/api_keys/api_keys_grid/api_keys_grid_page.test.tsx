/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fireEvent,
  render,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { mockAuthenticatedUser } from '../../../../common/model/authenticated_user.mock';
import { securityMock } from '../../../mocks';
import { Providers } from '../api_keys_management_app';
import { apiKeysAPIClientMock } from '../index.mock';
import { APIKeysGridPage } from './api_keys_grid_page';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

jest.setTimeout(15000);

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
      name: 'first-api-key',
      realm: 'reserved',
      username: 'elastic',
    },
    {
      creation: 1571322182082,
      expiration: 1571408582082,
      id: 'BO2XZwgJFuWTT0QQZ2m0',
      invalidated: false,
      name: 'second-api-key',
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

// FLAKY: https://github.com/elastic/kibana/issues/97085
describe.skip('APIKeysGridPage', () => {
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
    getByText(/first-api-key/);
    getByText(/second-api-key/);
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

  it('creates API key with optional expiration, redirects back and displays base64', async () => {
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

    fireEvent.change(await within(dialog).findByLabelText('Name'), {
      target: { value: 'Test' },
    });

    fireEvent.click(await within(dialog).findByLabelText('Expire after time'));

    fireEvent.click(await findByRole('button', { name: 'Create API key' }));

    const alert = await findByRole('alert');
    within(alert).getByText(/Enter a valid duration or disable this option\./i);

    fireEvent.change(await within(dialog).findByLabelText('Lifetime (days)'), {
      target: { value: '12' },
    });

    fireEvent.click(await findByRole('button', { name: 'Create API key' }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/api_key', {
        body: JSON.stringify({ name: 'Test', expiration: '12d' }),
      });
      expect(history.location.pathname).toBe('/');
    });

    await findByDisplayValue(btoa('1D:AP1_K3Y'));
  });

  it('deletes api key using cta button', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { findByRole, findAllByLabelText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    const [deleteButton] = await findAllByLabelText(/Delete/i);
    fireEvent.click(deleteButton);

    const dialog = await findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Delete API key' }));

    await waitFor(() => {
      expect(apiClientMock.invalidateApiKeys).toHaveBeenLastCalledWith(
        [{ id: '0QQZ2m0BO2XZwgJFuWTT', name: 'first-api-key' }],
        true
      );
    });
  });

  it('deletes multiple api keys using bulk select', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { findByRole, findAllByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage
          apiKeysAPIClient={apiClientMock}
          notifications={coreStart.notifications}
          history={history}
        />
      </Providers>
    );

    const deleteCheckboxes = await findAllByRole('checkbox', { name: 'Select this row' });
    deleteCheckboxes.forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.click(await findByRole('button', { name: 'Delete API keys' }));

    const dialog = await findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Delete API keys' }));

    await waitFor(() => {
      expect(apiClientMock.invalidateApiKeys).toHaveBeenLastCalledWith(
        [
          { id: '0QQZ2m0BO2XZwgJFuWTT', name: 'first-api-key' },
          { id: 'BO2XZwgJFuWTT0QQZ2m0', name: 'second-api-key' },
        ],
        true
      );
    });
  });
});
