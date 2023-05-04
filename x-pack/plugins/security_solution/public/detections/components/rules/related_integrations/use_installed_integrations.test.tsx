/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, cleanup } from '@testing-library/react-hooks';

import { useInstalledIntegrations } from './use_installed_integrations';

import { fleetIntegrationsApi } from '../../../../detection_engine/fleet_integrations/api';
import { useToasts } from '../../../../common/lib/kibana';

jest.mock('../../../../detection_engine/fleet_integrations/api');
jest.mock('../../../../common/lib/kibana');

describe('useInstalledIntegrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const createReactQueryWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Turn retries off, otherwise we won't be able to test errors
          retry: false,
        },
      },
    });
    const wrapper: React.FC = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  const render = () =>
    renderHook(
      () =>
        useInstalledIntegrations({
          packages: [],
        }),
      {
        wrapper: createReactQueryWrapper(),
      }
    );

  it('calls the API via fetchInstalledIntegrations', async () => {
    const fetchInstalledIntegrations = jest.spyOn(
      fleetIntegrationsApi,
      'fetchInstalledIntegrations'
    );

    const { waitForNextUpdate } = render();

    await waitForNextUpdate();

    expect(fetchInstalledIntegrations).toHaveBeenCalledTimes(1);
    expect(fetchInstalledIntegrations).toHaveBeenLastCalledWith(
      expect.objectContaining({ packages: [] })
    );
  });

  it('fetches data from the API', async () => {
    const { result, waitForNextUpdate } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents returns
    await waitForNextUpdate();

    // It switches to a success state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(true);
    expect(result.current.isError).toEqual(false);
    expect(result.current.data).toEqual([
      {
        integration_name: 'audit',
        integration_title: 'Audit Logs',
        is_enabled: true,
        package_name: 'atlassian_bitbucket',
        package_title: 'Atlassian Bitbucket',
        package_version: '1.0.1',
      },
      {
        is_enabled: true,
        package_name: 'system',
        package_title: 'System',
        package_version: '1.6.4',
      },
    ]);
  });

  // Skipping until we re-enable errors
  it.skip('handles exceptions from the API', async () => {
    const exception = new Error('Boom!');
    jest.spyOn(fleetIntegrationsApi, 'fetchInstalledIntegrations').mockRejectedValue(exception);

    const { result, waitForNextUpdate } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents throws
    await waitForNextUpdate();

    // It switches to an error state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(true);
    expect(result.current.error).toEqual(exception);

    // And shows a toast with the caught exception
    expect(useToasts().addError).toHaveBeenCalledTimes(1);
    expect(useToasts().addError).toHaveBeenCalledWith(exception, {
      title: 'Failed to fetch installed integrations',
    });
  });
});
