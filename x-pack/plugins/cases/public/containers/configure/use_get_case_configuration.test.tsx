/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetCaseConfiguration } from './use_get_case_configuration';
import * as api from './api';
import { waitFor } from '@testing-library/react';
import { useToasts } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('./api');
jest.mock('../../common/lib/kibana');

describe('Use get case configuration hook', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');

    const { waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });
    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({
      owner: ['securitySolution'],
      signal: expect.any(AbortSignal),
    });
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spy = jest.spyOn(api, 'getCaseConfigure').mockRejectedValue(new Error('error'));

    const { waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });
    await waitForNextUpdate();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        owner: ['securitySolution'],
        signal: expect.any(AbortSignal),
      });

      expect(addError).toHaveBeenCalled();
    });
  });

  it('returns the default if the response is null', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    spy.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      closureType: 'close-by-user',
      connector: { fields: null, id: 'none', name: 'none', type: '.none' },
      customFields: [],
      id: '',
      mappings: [],
      version: '',
    });
  });

  it('sets the initial data correctly', async () => {
    const spy = jest.spyOn(api, 'getCaseConfigure');
    // @ts-expect-error: no need to define all properties
    spy.mockResolvedValue({ id: 'my-new-configuration' });

    const { result, waitForNextUpdate } = renderHook(() => useGetCaseConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    /**
     * Ensures that the initial data are returned
     * before fetching
     */
    // @ts-expect-error: data are defined
    expect(result.all[0].data).toEqual({
      closureType: 'close-by-user',
      connector: { fields: null, id: 'none', name: 'none', type: '.none' },
      customFields: [],
      id: '',
      mappings: [],
      version: '',
    });

    /**
     * The response after fetching
     */
    // @ts-expect-error: data are defined
    expect(result.all[1].data).toEqual({ id: 'my-new-configuration' });
  });
});
