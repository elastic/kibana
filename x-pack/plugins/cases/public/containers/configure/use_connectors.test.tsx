/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { TestProviders } from '../../common/mock';
import { useApplicationCapabilities, useToasts } from '../../common/lib/kibana';
import { useGetConnectors } from './use_connectors';

const useApplicationCapabilitiesMock = useApplicationCapabilities as jest.Mocked<
  typeof useApplicationCapabilities
>;

jest.mock('../../common/lib/kibana');
jest.mock('./api');

describe('useConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches connectors', async () => {
    const spy = jest.spyOn(api, 'fetchConnectors');
    renderHook(() => useGetConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    });
  });

  it('shows a toast error when the API returns error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnfetchConnectors = jest.spyOn(api, 'fetchConnectors');
    spyOnfetchConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetConnectors(), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('does not fetch connectors when the user does not has access to actions', async () => {
    const spyOnFetchConnectors = jest.spyOn(api, 'fetchConnectors');
    useApplicationCapabilitiesMock().actions = { crud: false, read: false };

    const { result } = renderHook(() => useGetConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spyOnFetchConnectors).not.toHaveBeenCalled();
      expect(result.current.data).toEqual([]);
    });
  });
});
