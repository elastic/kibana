/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, within, waitForElementToBeRemoved } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { Providers } from '../account_management_app';
import { ApiKeysPage } from './api_keys_page';

const getApiKeysResponse = {
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
};

describe('ApiKeysPage', () => {
  it('fetches API keys on mount', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory();
    coreStart.http.get.mockResolvedValue(getApiKeysResponse);

    const { queryByText } = render(
      <Providers services={coreStart} history={history}>
        <ApiKeysPage />
      </Providers>
    );

    expect(coreStart.http.get).toHaveBeenLastCalledWith('/internal/security/api_key', {
      query: { isAdmin: false },
    });

    await waitForElementToBeRemoved(queryByText(/Loading API keys/i));
  });

  it('creates API key on form submit', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/api-keys/create'] });
    coreStart.http.get.mockResolvedValue(getApiKeysResponse);

    const { findByRole } = render(
      <Providers services={coreStart} history={history}>
        <ApiKeysPage />
      </Providers>
    );

    const flyout = await findByRole('dialog');
    fireEvent.change(within(flyout).getByLabelText(/Name/i), { target: { value: 'Test Key' } });
    fireEvent.click(within(flyout).getByRole('button', { name: /Create API key/i }));

    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/api_key', {
      body: '{"name":"Test Key"}',
    });

    await waitForElementToBeRemoved(() => within(flyout).queryByText(/Creating API key/i));
  });

  it('invalidates API key after confirmation', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory();
    coreStart.http.get.mockResolvedValue(getApiKeysResponse);

    const { findByRole, getByRole, queryByText } = render(
      <Providers services={coreStart} history={history}>
        <ApiKeysPage />
      </Providers>
    );

    const table = await findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Invalidate/i }));
    fireEvent.click(getByRole('button', { name: /Invalidate this key/i }));

    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/api_key/invalidate', {
      body: '{"apiKeys":[{"id":"0QQZ2m0BO2XZwgJFuWTT","name":"my-api-key"}],"isAdmin":false}',
    });

    await waitForElementToBeRemoved(() => queryByText(/Invalidating API key/i));
  });
});
