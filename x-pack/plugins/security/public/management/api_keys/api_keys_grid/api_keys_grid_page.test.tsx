/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';

import { APIKeysGridPage } from './api_keys_grid_page';
import { mockAuthenticatedUser } from '../../../../common/model/authenticated_user.mock';
import { securityMock } from '../../../mocks';
import { Providers } from '../api_keys_management_app';

/*
 * Note to engineers
 * we moved these 4 tests below to "x-pack/test/functional/apps/api_keys/home_page.ts":
 * 1-"creates API key when submitting form, redirects back and displays base64"
 * 2-"creates API key with optional expiration, redirects back and displays base64"
 * 3-"deletes multiple api keys using bulk select"
 * 4-"deletes api key using cta button"
 * to functional tests to avoid flakyness
 */

describe('APIKeysGridPage', () => {
  // We are spying on the console.error to avoid react to throw error
  // in our test "displays error when fetching API keys fails"
  // since we are using EuiErrorBoundary and react will console.error any errors
  const consoleWarnMock = jest.spyOn(console, 'error').mockImplementation();

  let coreStart: ReturnType<typeof coreMock.createStart>;
  const { authc } = securityMock.createSetup();

  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.http.get.mockClear();
    coreStart.http.get.mockClear();
    coreStart.http.post.mockClear();
    authc.getCurrentUser.mockClear();

    coreStart.http.post.mockResolvedValue({
      apiKeys: [
        {
          type: 'rest',
          creation: 1571322182082,
          expiration: 1571408582082,
          id: '0QQZ2m0BO2XZwgJFuWTT',
          invalidated: false,
          name: 'first-api-key',
          realm: 'reserved',
          username: 'elastic',
          metadata: {},
          role_descriptors: {},
        },
        {
          type: 'rest',
          creation: 1571322182082,
          expiration: 1571408582082,
          id: 'BO2XZwgJFuWTT0QQZ2m0',
          invalidated: false,
          name: 'second-api-key',
          realm: 'reserved',
          username: 'elastic',
          metadata: {},
          role_descriptors: {},
        },
      ],
      canManageCrossClusterApiKeys: true,
      canManageApiKeys: true,
      canManageOwnApiKeys: true,
      total: 2,
      aggregationTotal: 2,
      aggregations: {
        usernames: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'elastic',
              doc_count: 4256,
            },
          ],
        },
        types: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'rest',
              doc_count: 2,
            },
          ],
        },
        expired: {
          doc_count: 0,
        },
        managed: {
          buckets: {
            metadataBased: {
              doc_count: 0,
            },
            namePrefixBased: {
              doc_count: 0,
            },
          },
        },
      },
    });

    authc.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({
        username: 'elastic',
        full_name: '',
        email: '',
        enabled: true,
        roles: ['superuser'],
      })
    );
  });

  afterAll(() => {
    // Let's make sure we restore everything just in case
    consoleWarnMock.mockRestore();
  });

  it('loads and displays API keys', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      api_keys: {
        save: true,
      },
    };

    const { findByText, queryByTestId, getByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage />
      </Providers>
    );

    expect(queryByTestId('apiKeysCreateTableButton')).not.toBeInTheDocument();

    expect(await findByText(/Loading API keys/)).not.toBeInTheDocument();

    await findByText(/first-api-key/);

    const secondKey = getByText(/second-api-key/).closest('td');
    const secondKeyEuiLink = secondKey!.querySelector('button');
    expect(secondKeyEuiLink).not.toBeNull();
    expect(secondKeyEuiLink!.getAttribute('data-test-subj')).toBe('apiKeyRowName-second-api-key');
  });

  it('displays callout when API keys are disabled', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    coreStart.http.post.mockRejectedValueOnce({
      body: { message: 'disabled.feature="api_keys"' },
    });

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      api_keys: {
        save: true,
      },
    };

    const { findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage />
      </Providers>
    );

    expect(await findByText(/Loading API keys/)).not.toBeInTheDocument();
    await findByText(/API keys are disabled/);
  });

  it('displays error when user does not have required permissions', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    coreStart.http.post.mockRejectedValueOnce({
      body: { statusCode: 403, message: 'forbidden' },
    });

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      api_keys: {
        save: true,
      },
    };

    const { findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage />
      </Providers>
    );

    expect(await findByText(/Loading API keys/)).not.toBeInTheDocument();
    await findByText(/You do not have permission to manage API keys/);
  });

  it('displays error when fetching API keys fails', async () => {
    coreStart.http.post.mockRejectedValueOnce({
      body: {
        error: 'Internal Server Error',
        message: 'Internal Server Error',
        statusCode: 500,
      },
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      api_keys: {
        save: true,
      },
    };

    const { findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <APIKeysGridPage />
      </Providers>
    );

    expect(await findByText(/Loading API keys/)).not.toBeInTheDocument();
    await findByText(/Could not load API keys/);
  });

  describe('Read Only View', () => {
    beforeEach(() => {
      coreStart.http.post.mockResolvedValue({
        apiKeys: [],
        canManageCrossClusterApiKeys: false,
        canManageApiKeys: false,
        canManageOwnApiKeys: false,
        total: 0,
        aggregations: {},
        aggregationTotal: 0,
      });
    });

    it('should not display prompt `Create Button` when no API keys are shown', async () => {
      const history = createMemoryHistory({ initialEntries: ['/'] });

      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        api_keys: {
          save: false,
        },
      };

      const { findByText, queryByText } = render(
        <Providers services={coreStart} authc={authc} history={history}>
          <APIKeysGridPage />
        </Providers>
      );
      expect(await findByText(/Loading API keys/)).not.toBeInTheDocument();
      expect(await findByText('You do not have permission to create API keys')).toBeInTheDocument();
      expect(queryByText('Create API key')).not.toBeInTheDocument();
    });
  });
});
