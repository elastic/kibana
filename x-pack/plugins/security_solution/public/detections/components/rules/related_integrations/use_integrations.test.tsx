/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, cleanup, waitFor } from '@testing-library/react';

import { useIntegrations } from './use_integrations';

import { fleetIntegrationsApi } from '../../../../detection_engine/fleet_integrations/api';
import { useToasts } from '../../../../common/lib/kibana';
import { createReactQueryWrapper } from '../../../../common/mock';

jest.mock('../../../../detection_engine/fleet_integrations/api');
jest.mock('../../../../common/lib/kibana');

describe('useIntegrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const render = ({ skip } = { skip: false }) =>
    renderHook(
      () =>
        useIntegrations({
          skip,
        }),
      {
        wrapper: createReactQueryWrapper(),
      }
    );

  it('calls the API via fetchAllIntegrations', async () => {
    const fetchAllIntegrations = jest.spyOn(fleetIntegrationsApi, 'fetchAllIntegrations');

    render();

    await waitFor(() => null);

    expect(fetchAllIntegrations).toHaveBeenCalledTimes(1);
  });

  it('does not call the API when skip is true', async () => {
    const fetchAllIntegrations = jest.spyOn(fleetIntegrationsApi, 'fetchAllIntegrations');

    render({ skip: true });

    expect(fetchAllIntegrations).toHaveBeenCalledTimes(0);
  });

  it('fetches data from the API', async () => {
    const { result } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents returns
    await waitFor(() => !result.current.isLoading);

    // It switches to a success state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(true);
    expect(result.current.isError).toEqual(false);
    expect(result.current.data).toEqual([
      {
        package_name: 'o365',
        package_title: 'Microsoft 365',
        latest_package_version: '1.2.0',
        installed_package_version: '1.0.0',
        is_installed: false,
        is_enabled: false,
      },
      {
        integration_name: 'audit',
        integration_title: 'Audit Logs',

        package_name: 'atlassian_bitbucket',
        package_title: 'Atlassian Bitbucket',
        latest_package_version: '1.0.1',
        installed_package_version: '1.0.1',
        is_installed: true,
        is_enabled: true,
      },
      {
        package_name: 'system',
        package_title: 'System',
        latest_package_version: '1.6.4',
        installed_package_version: '1.6.4',
        is_installed: true,
        is_enabled: true,
      },
    ]);
  });

  // Skipping until we re-enable errors
  it.skip('handles exceptions from the API', async () => {
    const exception = new Error('Boom!');
    jest.spyOn(fleetIntegrationsApi, 'fetchAllIntegrations').mockRejectedValue(exception);

    const { result } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents throws
    await waitFor(() => null);

    // It switches to an error state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(true);
    expect(result.current.error).toEqual(exception);

    // And shows a toast with the caught exception
    expect(useToasts().addError).toHaveBeenCalledTimes(1);
    expect(useToasts().addError).toHaveBeenCalledWith(exception, {
      title: 'Failed to fetch integrations',
    });
  });
});
