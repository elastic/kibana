/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useConnectors, UseConnectorsResponse } from './use_connectors';
import * as api from './api';
import { connectorsMock } from '../mock';
import { TestProviders } from '../../common/mock';
import { useApplicationCapabilities } from '../../common/lib/kibana';

const useApplicationCapabilitiesMock = useApplicationCapabilities as jest.Mocked<
  typeof useApplicationCapabilities
>;

jest.mock('../../common/lib/kibana');
jest.mock('./api');

describe('useConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitFor } = renderHook<string, UseConnectorsResponse>(() => useConnectors(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          loading: true,
          connectors: [],
          refetchConnectors: result.current.refetchConnectors,
        });
      });
    });
  });

  it('fetch connectors', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        connectors: connectorsMock,
        refetchConnectors: result.current.refetchConnectors,
      });
    });
  });

  it('refetch connectors', async () => {
    const spyOnfetchConnectors = jest.spyOn(api, 'fetchConnectors');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.refetchConnectors();
      expect(spyOnfetchConnectors).toHaveBeenCalledTimes(2);
    });
  });

  it('set isLoading to true when refetching connectors', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.refetchConnectors();

      expect(result.current.loading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnfetchConnectors = jest.spyOn(api, 'fetchConnectors');
    spyOnfetchConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        connectors: [],
        refetchConnectors: result.current.refetchConnectors,
      });
    });
  });

  it('does not fetch connectors when the user does not has access to actions', async () => {
    const spyOnFetchConnectors = jest.spyOn(api, 'fetchConnectors');
    useApplicationCapabilitiesMock().actions = { crud: false, read: false };

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        connectors: [],
        refetchConnectors: result.current.refetchConnectors,
      });
    });

    expect(spyOnFetchConnectors).not.toHaveBeenCalled();
  });

  it('does not refetch connectors when the user does not has access to actions', async () => {
    const spyOnFetchConnectors = jest.spyOn(api, 'fetchConnectors');
    useApplicationCapabilitiesMock().actions = { crud: false, read: false };

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseConnectorsResponse>(
        () => useConnectors(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();
      result.current.refetchConnectors();

      expect(result.current).toEqual({
        loading: false,
        connectors: [],
        refetchConnectors: result.current.refetchConnectors,
      });
    });

    expect(spyOnFetchConnectors).not.toHaveBeenCalled();
  });
});
